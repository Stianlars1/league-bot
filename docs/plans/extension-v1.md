# Counter Companion v1 — Browser-extension build plan

**Status:** Plan, awaiting approval. No code yet.
**Recorded:** 2026-05-03
**Decisions baked in:** Direction = browser extension; data pipe + popup
status UI; Chrome + Edge + Firefox from v1; `extension/` at repo root; pair via
the existing 6-char code + `/api/companion/claim`; cert-warning click is an
acceptable onboarding cost.

## Why this plan exists

The `/companion` page is currently a developer-only surface. Customers are
non-technical and cannot install Node, run terminals, or reason about pnpm.
The `companion/poll.ts` Node script proves the data path works; the v1 job is
to wrap that data path in something a customer can install in one click from a
browser store. Per the research recorded in `docs/companion-app.md` Phase 1,
the chosen direction is a browser extension.

Two real onboarding costs are accepted up front:
1. The user has to click through Chrome's "this site is not secure" warning at
   `https://127.0.0.1:2999` once. The extension first-run flow walks them
   through this with explicit copy.
2. Cross-browser background architecture is split: Chrome/Edge use a service
   worker + offscreen document + heartbeat; Firefox uses an event page with a
   plain `setInterval`. The manifest declares both so a single codebase ships
   to all three stores.

## What v1 does

| Capability | In v1 |
|---|---|
| Poll `https://127.0.0.1:2999/liveclientdata/allgamedata` at 1Hz when paired | ✅ |
| Push frames (only when game-clock tick advances) to `/api/companion/ingest` | ✅ |
| Pair with a Counter web session via the existing 6-char code flow | ✅ |
| Persist pairing token in `chrome.storage.local` | ✅ |
| Popup UI: pairing state, last-frame age, frame counter, "open Counter", "unpair" | ✅ |
| First-run onboarding flow that walks the user through the cert-acceptance click | ✅ |
| Detect "no game running" vs "cert not accepted" vs "ingest failed" and report distinct states | ✅ |

## What v1 does NOT do (explicit out-of-scope)

| Capability | Why deferred |
|---|---|
| Dota GSI | Different protocol (push, not poll). Lock the League path first. |
| Auto-update channel selector / beta channel | Browser stores handle update delivery. No need for a UI knob in v1. |
| Content-script injection into counter.app | User chose "data pipe + popup" not "data pipe + content script". |
| Counter-side waitlist / signup / accounts | Not requested. Pairing is anonymous, token-only. |
| In-app notifications, badges, alerts | No requirement; minimizes Web Store review surface. |
| Telemetry / analytics inside the extension | No data-collection sink without explicit ask. |
| Onboarding tour beyond the cert step | Single mandatory step. Anything more goes through a separate ask. |

## Repo layout

```
extension/                                    (new — sibling to companion/)
  package.json                                ← own deps; not added to root package.json
  tsconfig.json
  esbuild.config.ts                           ← builds dist/chrome and dist/firefox
  README.md                                   ← dev/build/load-unpacked instructions
  manifest/
    manifest.chrome.json                      ← MV3 + service_worker + offscreen
    manifest.firefox.json                     ← MV3 + background.scripts (event page)
  src/
    background-sw.ts                          ← Chrome/Edge service worker entry
    background-event.ts                       ← Firefox event page entry
    offscreen.html                            ← Chrome/Edge hidden doc
    offscreen.ts                              ← poll loop runs here on Chrome/Edge
    popup.html                                ← popup shell
    popup.ts                                  ← popup logic (pair / status / unpair)
    popup.css
    lib/
      poll.ts                                 ← shared poll logic (port of companion/poll.ts)
      relay.ts                                ← POST /api/companion/ingest with token
      pair.ts                                 ← POST /api/companion/claim, store token
      storage.ts                              ← thin wrapper over chrome.storage.local
      cert-probe.ts                           ← preflight fetch to detect cert acceptance
      log.ts                                  ← scoped console logger (kept off in production)
  assets/
    icon-16.png   icon-48.png   icon-128.png  ← extension icon, 3 required sizes
  dist/                                       ← .gitignored — esbuild output
    chrome/                                   ← loadable as unpacked + zippable for Web Store
    firefox/                                  ← loadable as temporary add-on + zippable for AMO
```

The existing `companion/poll.ts` Node script stays. It remains the
developer/contributor mode and the data-path reference implementation.

## Manifest design

Two manifests, generated from one source where possible. Key differences:

```jsonc
// manifest/manifest.chrome.json (also used by Edge)
{
  "manifest_version": 3,
  "name": "Counter Companion",
  "version": "0.1.0",
  "description": "Realtime League of Legends data for counter.app",
  "permissions": ["storage", "offscreen", "alarms"],
  "host_permissions": [
    "https://127.0.0.1:2999/*",
    "https://counter.app/*"   // (or whatever the eventual host ends up being)
  ],
  "background": { "service_worker": "background-sw.js", "type": "module" },
  "action": { "default_popup": "popup.html", "default_icon": { "16": "assets/icon-16.png", "48": "assets/icon-48.png" } },
  "icons": { "16": "assets/icon-16.png", "48": "assets/icon-48.png", "128": "assets/icon-128.png" }
}
```

```jsonc
// manifest/manifest.firefox.json
{
  "manifest_version": 3,
  "name": "Counter Companion",
  "version": "0.1.0",
  "description": "Realtime League of Legends data for counter.app",
  "permissions": ["storage", "alarms"],
  "host_permissions": [
    "https://127.0.0.1:2999/*",
    "https://counter.app/*"
  ],
  "background": { "scripts": ["background-event.js"], "type": "module" },
  "action": { "default_popup": "popup.html" },
  "icons": { "16": "assets/icon-16.png", "48": "assets/icon-48.png", "128": "assets/icon-128.png" },
  "browser_specific_settings": {
    "gecko": { "id": "counter-companion@counter.app", "strict_min_version": "115.0" }
  }
}
```

`offscreen` permission is Chrome-only (Firefox doesn't have the API and
doesn't need it). `host_permissions` for `127.0.0.1:2999` is what allows the
extension to fetch the loopback API.

## Architecture

### Chrome + Edge

```
[popup.ts] ─── chrome.runtime.sendMessage ──→ [background-sw.ts]
                                                    │
                              chrome.offscreen.createDocument()
                                                    │
                                                    ▼
                                          [offscreen.html]
                                          [offscreen.ts]   ← runs setInterval(poll, 1000)
                                                    │
                              every 25s: chrome.runtime.sendMessage({keepAlive: true})
                              every poll tick that produced a new frame:
                                chrome.runtime.sendMessage({type: "frame", payload})
                                                    │
                                                    ▼
                                          [background-sw.ts]
                                              ▼
                                    fetch POST /api/companion/ingest
```

The service worker only exists to receive messages from the offscreen doc and
forward frames over the network. The offscreen doc owns the timer. Heartbeat
sendMessage every 25s keeps the SW from going idle so it can serve the
forward-to-relay role.

### Firefox

```
[popup.ts] ─── browser.runtime.sendMessage ──→ [background-event.ts]
                                                       │
                                          setInterval(poll, 1000) runs HERE directly
                                                       │
                                          on new frame: fetch POST /api/companion/ingest
```

Event pages in Firefox MV3 stay alive while there's pending work. No offscreen
doc needed, no heartbeat needed. The poll loop and the relay POST live in the
same script.

Both code paths share `lib/poll.ts`, `lib/relay.ts`, `lib/storage.ts`,
`lib/pair.ts`, `lib/cert-probe.ts`. Only the entry points differ.

## Pairing flow

Identical to the current Phase 0 flow — no server changes required:

1. User opens the popup. If unpaired, popup shows a "Pair this browser"
   button.
2. Click → opens `https://counter.app/companion` in a new tab. User clicks
   "Generate pairing code →" inside the developer disclosure (which we'll
   relabel — see "Web-side copy changes" below). Code shown.
3. User copies the 6-char code, pastes into the popup's input.
4. Popup calls `POST /api/companion/claim` with the code. Gets back the token.
5. Token stored via `chrome.storage.local`. Popup transitions to "Paired"
   state.

The web-side `/api/companion/pair` and `/api/companion/claim` endpoints are
already built and tested. No new server work for pairing.

### Web-side copy changes (in scope, small)

Once the extension exists and is the recommended path:
- `companion-panel.tsx`: rename the developer disclosure summary from
  "I'm a developer or contributor — show the manual pairing flow" to
  something like "Pair via 6-char code (used by the browser extension and dev
  CLI)."
- `companion/page.tsx`: replace the "distribution method is being evaluated"
  notes with a one-line "Install the Counter Companion browser extension"
  pointer + store links once they exist.

These web-side edits happen in the same session that ships the extension. No
copy promises about the extension before it actually ships.

## Cert-acceptance onboarding

The single hardest UX moment. The plan:

1. After pairing, popup runs a `cert-probe.ts` preflight: `fetch("https://127.0.0.1:2999/liveclientdata/allgamedata")`.
2. Three possible outcomes:
   - **200/404** (game running or not, but cert is accepted) → all good, show
     "Connected" state, kick off poll loop.
   - **TypeError "Failed to fetch" / cert error** → show a card in the popup:

     > **One last step.** Your browser needs to trust your local League
     > client's connection. Click below — Chrome will show a warning. Click
     > "Advanced" and then "Proceed to 127.0.0.1 (unsafe)." This is safe;
     > 127.0.0.1 is your own machine.
     >
     > [Open the trust prompt →]
   - **Game not running** (covered by 200/404 case) → show "Waiting for a
     League match to start" + frame counter idle.
3. The "Open the trust prompt →" button opens
   `https://127.0.0.1:2999/liveclientdata/allgamedata` in a new tab. User
   clicks through, browser remembers acceptance. Re-running the popup probe
   succeeds.

This step happens once per browser per machine. It's also the same step
required by every documented Live Client Data API library — we are not
inventing new pain, we're just being explicit about it.

## Build pipeline

```
extension/
  esbuild bundles src/* → dist/chrome/*.js + dist/firefox/*.js
  copies manifest/manifest.chrome.json → dist/chrome/manifest.json
  copies manifest/manifest.firefox.json → dist/firefox/manifest.json
  copies popup.html, popup.css, offscreen.html, assets/* → both dist/ subdirs
```

`pnpm --filter counter-companion-extension build` produces both. Two
artifacts:
- `dist/chrome/` — load as unpacked in Chrome/Edge for dev; zip for Web Store
- `dist/firefox/` — load as temporary add-on in Firefox for dev; zip for AMO

No GitHub Actions workflow in v1 — manual builds and uploads to each store.
CI/CD added later if release cadence justifies it.

## Store accounts (prerequisite — none exist yet)

| Store | Cost | Setup time | Notes |
|---|---|---|---|
| Chrome Web Store | $5 one-time | ~10 min | Google account + payment. Unlocks Chrome AND Edge users (Edge accepts Chrome installs). |
| Microsoft Edge Add-ons | Free | ~30 min | Requires Microsoft Partner Center enrollment (also free). Optional in v1 — Edge users can install from Chrome Web Store. |
| Firefox AMO | Free | ~10 min | addons.mozilla.org account. |

Recommend: register Chrome Web Store + Firefox AMO before submission. Defer
Edge Add-ons to a later session.

## Verification

End-to-end manual test before claiming v1 done:

1. `pnpm --filter counter-companion-extension build` — clean build for both
   targets.
2. Load `dist/chrome/` in Chrome via `chrome://extensions` → "Load unpacked".
3. Click extension icon → popup opens → shows "Unpaired" state.
4. Click "Pair this browser" → counter.app/companion opens → generate code →
   paste in popup → "Paired" state.
5. Cert preflight runs. If game not running and cert accepted → "Waiting for a
   League match" state. If cert not accepted → onboarding card appears, click
   through, re-runs probe.
6. Start a League match (or use the existing test harness against the synthetic
   Phase 0 frame). Frames start arriving in the popup counter, frames hit
   `/api/companion/ingest`, the live view in counter.app/live updates via SSE.
7. Repeat steps 2–6 in Firefox with `dist/firefox/` loaded as a temporary
   add-on at `about:debugging`.
8. Repeat in Edge with `dist/chrome/` loaded.
9. `pnpm exec tsc --noEmit` clean.

## Open questions to lock before any code

- **Extension name displayed in stores.** "Counter Companion"? "Counter Live"?
  Match what the existing web nav says.
- **Icon/branding asset.** Do we have an icon for the extension, or do I need
  to mock something neutral and you swap it later?
- **Counter relay host in production.** The manifest's `host_permissions`
  entry needs the real production hostname (currently `https://counter.app/*`
  is a placeholder). What's the actual one?
- **Token revocation story.** Currently if the user clicks "Unpair this
  browser" in the web `/companion` panel, the extension still has its token
  and would keep ingesting. In v1 do we (a) accept this and only revoke from
  the extension side, or (b) add a small server-side `/api/companion/revoke`
  endpoint and have both surfaces use it? My read: (a) for v1, defer (b).
  Wants your call.

## How long this is

Honest estimate, single focused session: **3–5 hours of implementation** once
the questions above are answered. Plus store-submission time which is
async-bounded by Web Store/AMO review (Chrome ~1–3 days, Firefox ~1–7 days).
