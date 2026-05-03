// Firefox event-page entry. Firefox MV3 doesn't support OffscreenDocuments,
// but event pages stay alive while there's pending work — so we run the poll
// loop directly here. Same lifecycle as Chrome's offscreen + SW combined.
//
// Same runtime-state persistence as the Chrome path so the user-visible
// counters survive any restart.

import { log } from "./lib/log";
import { getStoredToken } from "./lib/pair";
import { isPolling, startPoll, stopPoll, type PollTickInfo } from "./lib/poll";
import {
  clearRuntimeState,
  loadRuntimeState,
  saveRuntimeState,
} from "./lib/runtime-state";

let lastTick: PollTickInfo | null = null;
let frameCount = 0;
let pushedCount = 0;

function broadcast(message: unknown): void {
  chrome.runtime.sendMessage(message).catch(() => {
    /* no listeners is fine */
  });
}

function onPollTick(info: PollTickInfo): void {
  lastTick = info;
  frameCount++;
  if (info.status === "pushed") {
    pushedCount++;
    void saveRuntimeState({ pushedCount, lastPush: info });
  }
  broadcast({ type: "poll-tick", info, frameCount, pushedCount });
}

async function startIfTokenPresent(): Promise<void> {
  const token = await getStoredToken();
  if (!token) {
    log("event-page idle — no token");
    return;
  }
  const persisted = await loadRuntimeState();
  pushedCount = persisted.pushedCount;
  lastTick = persisted.lastPush;
  if (isPolling()) return;
  startPoll({ token, onTick: onPollTick });
}

async function stopAndReset(): Promise<void> {
  stopPoll();
  frameCount = 0;
  pushedCount = 0;
  lastTick = null;
  await clearRuntimeState();
}

chrome.runtime.onInstalled.addListener(() => {
  void startIfTokenPresent();
});
chrome.runtime.onStartup.addListener(() => {
  void startIfTokenPresent();
});
void startIfTokenPresent();

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return false;
  switch (msg.type) {
    case "request-state":
      sendResponse({
        polling: isPolling(),
        frameCount,
        pushedCount,
        lastTick,
      });
      return false;
    case "ensure-poll":
      void startIfTokenPresent();
      sendResponse({ ok: true });
      return false;
    case "stop-poll":
      void stopAndReset();
      sendResponse({ ok: true });
      return false;
    default:
      return false;
  }
});
