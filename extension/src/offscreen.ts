// Chrome / Edge offscreen document. Hosts the actual 1Hz poll loop because
// MV3 service workers can't keep one alive. Pings the SW every 25s so it
// stays available to handle messages from the popup.
//
// Persists pushedCount + lastPush to chrome.storage.local on each push event,
// so the user-visible stats survive the SW lifecycle dance (Chrome tears the
// SW + offscreen down after ~30s idle; the persisted numbers re-hydrate on
// the next wake).

import { log } from "./lib/log";
import { getStoredToken } from "./lib/pair";
import { isPolling, startPoll, stopPoll, type PollTickInfo } from "./lib/poll";
import {
  clearRuntimeState,
  loadRuntimeState,
  saveRuntimeState,
} from "./lib/runtime-state";

const KEEPALIVE_MS = 25_000;

let lastTick: PollTickInfo | null = null;
let frameCount = 0;
let pushedCount = 0;
let keepAliveHandle: ReturnType<typeof setInterval> | null = null;

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
    log("offscreen idle — no token");
    return;
  }
  // Hydrate from persisted state so the counter doesn't drop to 0 on SW
  // restart. frameCount stays a fresh-per-restart diagnostic.
  const persisted = await loadRuntimeState();
  pushedCount = persisted.pushedCount;
  lastTick = persisted.lastPush;
  if (isPolling()) return;
  startPoll({ token, onTick: onPollTick });
  if (keepAliveHandle === null) {
    keepAliveHandle = setInterval(() => {
      chrome.runtime.sendMessage({ type: "keepAlive" }).catch(() => {});
    }, KEEPALIVE_MS);
  }
}

async function stopAndReset(): Promise<void> {
  stopPoll();
  if (keepAliveHandle !== null) {
    clearInterval(keepAliveHandle);
    keepAliveHandle = null;
  }
  frameCount = 0;
  pushedCount = 0;
  lastTick = null;
  await clearRuntimeState();
}

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
      return false;
    case "stop-poll":
      void stopAndReset();
      return false;
    default:
      return false;
  }
});
