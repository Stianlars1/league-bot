// Chrome / Edge service-worker entry. The SW does NOT host the poll loop
// (MV3 service workers suspend after ~30s of inactivity). It only owns the
// offscreen-document lifecycle and ack's the keepAlive heartbeat from the
// offscreen doc, which keeps the SW alive long enough to stay reachable.

import { error, log } from "./lib/log";
import { getStoredToken } from "./lib/pair";

const OFFSCREEN_URL = "offscreen.html";

async function hasOffscreen(): Promise<boolean> {
  const contexts = await chrome.runtime.getContexts({
    contextTypes: [chrome.runtime.ContextType.OFFSCREEN_DOCUMENT],
  });
  return contexts.length > 0;
}

async function ensureOffscreen(): Promise<void> {
  if (await hasOffscreen()) return;
  await chrome.offscreen.createDocument({
    url: OFFSCREEN_URL,
    reasons: [chrome.offscreen.Reason.WORKERS],
    justification:
      "Polls Riot's local Live Client Data at 1Hz; MV3 service workers cannot host long-running setInterval loops.",
  });
  log("offscreen created");
}

async function closeOffscreenIfPresent(): Promise<void> {
  if (!(await hasOffscreen())) return;
  await chrome.offscreen.closeDocument();
  log("offscreen closed");
}

async function bootstrap(): Promise<void> {
  const token = await getStoredToken();
  if (token) await ensureOffscreen();
}

chrome.runtime.onInstalled.addListener(() => {
  void bootstrap();
});
chrome.runtime.onStartup.addListener(() => {
  void bootstrap();
});

chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (!msg || typeof msg !== "object" || typeof msg.type !== "string") return false;
  switch (msg.type) {
    case "ensure-poll":
      void (async () => {
        try {
          await ensureOffscreen();
          sendResponse({ ok: true });
        } catch (err) {
          error("ensure-poll failed", err);
          sendResponse({ ok: false, error: String(err) });
        }
      })();
      return true;
    case "stop-poll":
      void (async () => {
        try {
          await closeOffscreenIfPresent();
          sendResponse({ ok: true });
        } catch (err) {
          error("stop-poll failed", err);
          sendResponse({ ok: false, error: String(err) });
        }
      })();
      return true;
    case "keepAlive":
      // Receiving this message resets the SW's idle timer. Ack so the
      // offscreen doc knows we're alive.
      sendResponse({ ok: true });
      return false;
    default:
      return false;
  }
});
