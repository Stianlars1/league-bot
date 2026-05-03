import { LIVE_CLIENT_PROBE_URL, probeLiveClient } from "./lib/cert-probe";
import { getStoredToken, pairWithCode, unpair } from "./lib/pair";
import type { PollTickInfo } from "./lib/poll";
import { getRelayHost, setRelayHost } from "./lib/relay";
import { loadRuntimeState } from "./lib/runtime-state";
import { getItem, removeItem, setItem } from "./lib/storage";

const CERT_ACCEPTED_KEY = "certAcceptedAt";
const PAIR_IN_PROGRESS_KEY = "pairInProgressAt";
const PAIR_TAB_KEY = "pairTabId";
// Pairing codes expire after 5 minutes server-side. Double the window so a
// stale "pair in progress" flag can't trap the popup in the form view.
const PAIR_IN_PROGRESS_TTL_MS = 10 * 60 * 1000;

type View =
  | { kind: "loading" }
  | { kind: "unpaired" }
  | { kind: "pair-form"; pairUrl: string; error?: string; submitting?: boolean }
  | { kind: "needs-cert" }
  | { kind: "paired"; frameCount: number; pushedCount: number; lastTick: PollTickInfo | null };

const $body = document.getElementById("body") as HTMLElement;
const $pill = document.getElementById("pill") as HTMLElement;

let view: View = { kind: "loading" };
let liveTickInfo: { frameCount: number; pushedCount: number; lastTick: PollTickInfo | null } | null = null;

// ---------- Tiny DOM builder ----------
// All popup UI is built via createElement + textContent so no caller can pass
// untrusted strings into innerHTML by accident. Keeps the popup XSS-proof
// regardless of where copy comes from.

interface ElProps {
  className?: string;
  text?: string;
  attrs?: Record<string, string>;
  on?: Record<string, EventListener>;
}

function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  props: ElProps = {},
  children: (Node | null | undefined)[] = [],
): HTMLElementTagNameMap[K] {
  const node = document.createElement(tag);
  if (props.className) node.className = props.className;
  if (props.text !== undefined) node.textContent = props.text;
  if (props.attrs) {
    for (const [k, v] of Object.entries(props.attrs)) node.setAttribute(k, v);
  }
  if (props.on) {
    for (const [event, handler] of Object.entries(props.on)) node.addEventListener(event, handler);
  }
  for (const c of children) if (c) node.appendChild(c);
  return node;
}

function text(s: string): Text {
  return document.createTextNode(s);
}

// ---------- Formatters ----------

function fmtAge(ms: number): string {
  if (ms < 1500) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  return `${Math.floor(ms / 3_600_000)}h ago`;
}

function fmtClock(seconds?: number): string {
  if (typeof seconds !== "number") return "—:—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

// ---------- Pill ----------

function setPill(state: "loading" | "connected" | "waiting" | "cert" | "error", label: string): void {
  $pill.dataset.state = state;
  $pill.textContent = label;
}

// ---------- Renderers ----------

function setView(next: View): void {
  view = next;
  render();
}

function render(): void {
  $body.replaceChildren();
  switch (view.kind) {
    case "loading":
      setPill("loading", "…");
      $body.appendChild(el("p", { className: "loading", text: "Loading…" }));
      return;
    case "unpaired":
      renderUnpaired();
      return;
    case "pair-form":
      renderPairForm(view);
      return;
    case "needs-cert":
      renderNeedsCert();
      return;
    case "paired":
      renderPaired(view);
      return;
  }
}

function renderUnpaired(): void {
  setPill("waiting", "Not paired");
  const card = el("div", { className: "card" }, [
    el("p", {
      className: "copy",
      text: "Counter Companion needs a one-time pairing handshake with your Counter web session before it can stream data.",
    }),
    el("button", {
      className: "btn-primary",
      text: "Pair this browser →",
      on: { click: () => void onStartPair() },
    }),
  ]);
  $body.appendChild(card);
  $body.appendChild(buildAdvanced());
}

function renderPairForm(v: Extract<View, { kind: "pair-form" }>): void {
  setPill("waiting", "Awaiting code");
  const hostLabel = el("code", { text: `${new URL(v.pairUrl).host}/companion` });
  const copy = el("p", { className: "copy" }, [
    text("Open the companion page on "),
    hostLabel,
    text(", generate a 6-character code, and paste it below. The popup closes when the new tab opens — click the toolbar icon to come back here and paste."),
  ]);
  const openBtn = el("button", {
    className: "btn-ghost",
    text: "Open companion page →",
    on: { click: () => void onOpenCompanionTab() },
  });
  const input = el("input", {
    className: "input",
    attrs: {
      type: "text",
      placeholder: "ABC-123",
      maxlength: "7",
      autocapitalize: "characters",
      autocomplete: "off",
      spellcheck: "false",
    },
    on: {
      keydown: (e) => {
        if ((e as KeyboardEvent).key === "Enter") void onSubmitPair();
      },
    },
  }) as HTMLInputElement;
  const errorNode = v.error
    ? el("div", { className: "error", text: v.error })
    : null;
  const submitBtn = el("button", {
    className: "btn-primary",
    text: v.submitting ? "Pairing…" : "Connect",
    on: { click: () => void onSubmitPair() },
  });
  if (v.submitting) submitBtn.setAttribute("disabled", "");
  const cancelBtn = el("button", {
    className: "btn-ghost",
    text: "Cancel",
    on: {
      click: () => {
        void clearPairInProgress({ closeTab: true });
        setView({ kind: "unpaired" });
      },
    },
  });
  const row = el("div", { className: "row", attrs: { style: "justify-content: space-between;" } }, [
    cancelBtn,
    submitBtn,
  ]);
  const card = el("div", { className: "card" }, [copy, openBtn, input, errorNode, row]);
  $body.appendChild(card);
  setTimeout(() => input.focus(), 0);
}

function renderNeedsCert(): void {
  setPill("cert", "Trust step");
  const copyP = el("p", { className: "copy" });
  copyP.appendChild(el("strong", { text: "One last step." }));
  copyP.appendChild(text(" Your browser needs to trust your local League client's connection. Click below — the browser will show a security warning. Click "));
  copyP.appendChild(el("strong", { text: "Advanced" }));
  copyP.appendChild(text(" and then "));
  copyP.appendChild(el("strong", { text: "Proceed to 127.0.0.1 (unsafe)" }));
  copyP.appendChild(text(". This is safe; 127.0.0.1 is your own machine."));
  const card = el("div", { className: "card warn" }, [
    copyP,
    el("button", {
      className: "btn-primary",
      text: "Open the trust prompt →",
      on: { click: () => chrome.tabs.create({ url: LIVE_CLIENT_PROBE_URL }) },
    }),
    el("button", {
      className: "btn-ghost",
      text: "I've done this — continue",
      on: { click: () => void onCertAcknowledged() },
    }),
  ]);
  $body.appendChild(card);
  $body.appendChild(buildAdvanced());
  $body.appendChild(buildFooter());
}

function renderPaired(v: Extract<View, { kind: "paired" }>): void {
  const tick = v.lastTick;
  const flowing = Boolean(
    v.pushedCount > 0 && tick && tick.pushedAt && Date.now() - tick.pushedAt < 5000,
  );
  setPill(flowing ? "connected" : "waiting", flowing ? "Live" : "Waiting");
  const lastFrameAge = tick?.pushedAt ? fmtAge(Date.now() - tick.pushedAt) : "—";
  const stats = el("div", { className: "stat-grid" }, [
    stat("Pushed", String(v.pushedCount)),
    stat("Last frame", lastFrameAge),
    stat("Game time", fmtClock(tick?.gameTime)),
    stat("Players", tick?.playerCount !== undefined ? String(tick.playerCount) : "—"),
  ]);
  const copy = el("p", {
    className: "copy",
    text: flowing
      ? "Streaming frames to your Counter view."
      : "Paired and watching for a League match. Start one in your client and frames will arrive here.",
  });
  $body.appendChild(el("div", { className: "card" }, [copy, stats]));
  $body.appendChild(buildAdvanced());
  $body.appendChild(buildFooter());
}

function stat(label: string, value: string): HTMLElement {
  return el("div", { className: "stat" }, [
    el("div", { className: "stat-label", text: label }),
    el("div", { className: "stat-value", text: value }),
  ]);
}

function buildFooter(): HTMLElement {
  const meta = el("span", { className: "muted", attrs: { id: "host-meta" } });
  void renderHostMetaInto(meta);
  return el("div", { className: "foot" }, [
    el("button", {
      className: "link",
      text: "Unpair this browser",
      on: { click: () => void onUnpair() },
    }),
    meta,
  ]);
}

function buildAdvanced(): HTMLElement {
  const details = el("details", { className: "advanced" });
  const summary = el("summary", { className: "advanced-summary", text: "Advanced — change relay host" });
  details.appendChild(summary);

  const hostInput = el("input", {
    className: "input advanced-input",
    attrs: {
      type: "text",
      placeholder: "https://counter.app",
      autocomplete: "off",
      spellcheck: "false",
    },
  }) as HTMLInputElement;

  // Pre-fill with the current value.
  void getRelayHost().then((h) => {
    hostInput.value = h;
  });

  const status = el("span", { className: "muted advanced-status" });

  function setStatus(message: string, ok = true): void {
    status.textContent = message;
    status.dataset.kind = ok ? "ok" : "err";
  }

  const saveBtn = el("button", {
    className: "btn-ghost",
    text: "Save",
    on: {
      click: async () => {
        const candidate = hostInput.value.trim().replace(/\/$/, "");
        if (!candidate) {
          setStatus("Enter a host URL.", false);
          return;
        }
        try {
          // Cheap validation — must be parseable and use http/https.
          const url = new URL(candidate);
          if (url.protocol !== "http:" && url.protocol !== "https:") {
            setStatus("Host must be http:// or https://.", false);
            return;
          }
        } catch {
          setStatus("Not a valid URL.", false);
          return;
        }
        await setRelayHost(candidate);
        setStatus("Saved.");
        // Refresh visible footer "→ host" label if present.
        const footMeta = document.getElementById("host-meta");
        if (footMeta) footMeta.textContent = `→ ${new URL(candidate).host}`;
      },
    },
  });

  const row = el("div", { className: "advanced-row" }, [hostInput, saveBtn]);
  const note = el("p", {
    className: "muted advanced-note",
    text: "Defaults to the production host. Override for local development; takes effect on next pair / next request.",
  });

  details.appendChild(note);
  details.appendChild(row);
  details.appendChild(status);

  return details;
}

async function renderHostMetaInto(node: HTMLElement): Promise<void> {
  const host = await getRelayHost();
  node.textContent = `→ ${new URL(host).host}`;
}

// ---------- Actions ----------

async function onStartPair(): Promise<void> {
  // Render the pair-form first; the user clicks "Open companion page" inside
  // the form to actually open the tab. Splitting "show form" from "open tab"
  // is the whole point — a Chrome popup is destroyed the moment focus moves
  // to a new tab, so any view we transition into during chrome.tabs.create
  // never gets seen.
  const host = await getRelayHost();
  const pairUrl = `${host}/companion`;
  setView({ kind: "pair-form", pairUrl });
}

async function onOpenCompanionTab(): Promise<void> {
  // Mark in-progress BEFORE chrome.tabs.create — that call steals focus and
  // tears the popup down, so any awaits afterwards are best-effort.
  await setItem(PAIR_IN_PROGRESS_KEY, Date.now());
  // Close any tab a previous attempt left around so we don't pile up orphans.
  const prevId = await getItem<number>(PAIR_TAB_KEY);
  if (typeof prevId === "number") chrome.tabs.remove(prevId).catch(() => {});
  const host = await getRelayHost();
  const pairUrl = `${host}/companion`;
  const tab = await chrome.tabs.create({ url: pairUrl });
  if (typeof tab.id === "number") await setItem(PAIR_TAB_KEY, tab.id);
}

async function clearPairInProgress(opts: { closeTab: boolean }): Promise<void> {
  if (opts.closeTab) {
    const tabId = await getItem<number>(PAIR_TAB_KEY);
    if (typeof tabId === "number") chrome.tabs.remove(tabId).catch(() => {});
  }
  await removeItem(PAIR_IN_PROGRESS_KEY);
  await removeItem(PAIR_TAB_KEY);
}

async function onSubmitPair(): Promise<void> {
  if (view.kind !== "pair-form" || view.submitting) return;
  const input = $body.querySelector("input.input") as HTMLInputElement | null;
  const raw = input?.value ?? "";
  setView({ ...view, submitting: true, error: undefined });
  const result = await pairWithCode(raw);
  if (!result.ok) {
    setView({ ...view, submitting: false, error: result.error });
    return;
  }
  await clearPairInProgress({ closeTab: true });
  chrome.runtime.sendMessage({ type: "ensure-poll" }).catch(() => {});
  await routeAfterPair();
}

async function routeAfterPair(): Promise<void> {
  const certAccepted = await getItem<number>(CERT_ACCEPTED_KEY);
  if (certAccepted) {
    await openPaired();
  } else {
    setView({ kind: "needs-cert" });
  }
}

async function onCertAcknowledged(): Promise<void> {
  const ok = await probeLiveClient();
  // We trust the user's "I've done this" click regardless of probe result —
  // the probe also fails when no League game is running, so a failure here
  // doesn't reliably mean cert is still rejected. If frames never arrive
  // they'll come back to the popup and notice.
  void ok;
  await setItem(CERT_ACCEPTED_KEY, Date.now());
  await openPaired();
}

async function openPaired(): Promise<void> {
  const state = liveTickInfo ?? { frameCount: 0, pushedCount: 0, lastTick: null };
  setView({ kind: "paired", ...state });
  void requestStateFromBackground();
}

async function onUnpair(): Promise<void> {
  await unpair();
  // Defensive: a normal pair-success path already cleared these, but if the
  // user somehow held both a stored token and a stale in-progress flag, wipe
  // both together so the next pair attempt starts clean.
  await clearPairInProgress({ closeTab: false });
  chrome.runtime.sendMessage({ type: "stop-poll" }).catch(() => {});
  liveTickInfo = null;
  setView({ kind: "unpaired" });
}

async function requestStateFromBackground(): Promise<void> {
  try {
    const reply = (await chrome.runtime.sendMessage({ type: "request-state" })) as
      | { polling: boolean; frameCount: number; pushedCount: number; lastTick: PollTickInfo | null }
      | undefined;
    if (!reply) return;
    liveTickInfo = {
      frameCount: reply.frameCount,
      pushedCount: reply.pushedCount,
      lastTick: reply.lastTick,
    };
    if (view.kind === "paired") {
      setView({ kind: "paired", ...liveTickInfo });
    }
  } catch {
    /* background not ready yet — popup will re-receive on next tick broadcast */
  }
}

chrome.runtime.onMessage.addListener((msg) => {
  if (!msg || msg.type !== "poll-tick") return false;
  liveTickInfo = {
    frameCount: msg.frameCount,
    pushedCount: msg.pushedCount,
    lastTick: msg.info,
  };
  if (view.kind === "paired") {
    setView({ kind: "paired", ...liveTickInfo });
  }
  return false;
});

async function bootstrap(): Promise<void> {
  // Hydrate from persisted runtime state BEFORE any view renders, so the
  // popup never flashes "—" when the SW has restarted between sessions.
  const persisted = await loadRuntimeState();
  liveTickInfo = {
    frameCount: 0, // diagnostic only; doesn't survive restart by design
    pushedCount: persisted.pushedCount,
    lastTick: persisted.lastPush,
  };

  const token = await getStoredToken();
  if (!token) {
    // If a pair flow is mid-flight (user clicked "Open companion page" and
    // the popup closed when the new tab took focus), restore the pair-form
    // view so they have an input to paste the code into. Without this, the
    // popup would land back on "Not paired" and the user would have nowhere
    // to put the code they just generated.
    const inProgressAt = await getItem<number>(PAIR_IN_PROGRESS_KEY);
    if (
      typeof inProgressAt === "number" &&
      Date.now() - inProgressAt < PAIR_IN_PROGRESS_TTL_MS
    ) {
      const host = await getRelayHost();
      setView({ kind: "pair-form", pairUrl: `${host}/companion` });
      return;
    }
    if (typeof inProgressAt === "number") {
      // Stale flag — wipe it so the unpaired view isn't shadowed next time.
      await clearPairInProgress({ closeTab: false });
    }
    setView({ kind: "unpaired" });
    return;
  }
  chrome.runtime.sendMessage({ type: "ensure-poll" }).catch(() => {});
  await routeAfterPair();
}

void bootstrap();
