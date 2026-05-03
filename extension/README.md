# Counter Companion — browser extension

The Counter Companion v1 distribution: a Manifest V3 browser extension that
polls Riot's Live Client Data API at `https://127.0.0.1:2999` and forwards
frames to the Counter relay. See [`../docs/plans/extension-v1.md`](../docs/plans/extension-v1.md)
for the full build plan and the decisions baked into it.

## Quick start

```bash
cd extension
pnpm install
pnpm build              # produces dist/chrome/ and dist/firefox/
```

### Load in Chrome / Edge

1. Open `chrome://extensions` (or `edge://extensions`).
2. Enable "Developer mode".
3. "Load unpacked" → pick `extension/dist/chrome/`.

### Load in Firefox

1. Open `about:debugging#/runtime/this-firefox`.
2. "Load Temporary Add-on..." → pick `extension/dist/firefox/manifest.json`.

(Firefox temporary add-ons are removed when the browser closes. For longer dev
sessions, run an unbranded build of Firefox or Firefox Developer Edition.)

### Watch mode

```bash
pnpm watch
```

Then reload the extension in `chrome://extensions` after each rebuild.

## Pairing

Same 6-character pairing code flow as the Phase 0 `pnpm companion:dev` script:

1. Click the extension toolbar icon.
2. "Pair this browser" → opens `counter.app/companion` in a new tab.
3. Inside the developer disclosure on that page, generate a pairing code.
4. Paste the code into the extension popup.

Token is stored in `chrome.storage.local`. The extension calls the existing
`/api/companion/claim` endpoint — no new server code.

## Cert acceptance (one-time)

Riot's Live Client API uses a self-signed cert. Browsers cannot bypass cert
validation from `fetch()`, so the user has to accept the cert once per
browser. The extension popup detects this and walks the user through:

1. Popup opens `https://127.0.0.1:2999/liveclientdata/allgamedata` in a tab.
2. Browser shows the "this site is not secure" warning.
3. User clicks "Advanced → Proceed to 127.0.0.1 (unsafe)".
4. Cert is sticky-accepted; extension `fetch()` works after.

## Override the relay host (dev)

The extension defaults to `https://counter.app` (placeholder until production
hostname is known). To point it at your local dev server, open the extension's
service-worker DevTools console and run:

```js
chrome.storage.local.set({ relayHost: "http://localhost:3000" })
```

Then unpair + re-pair so the extension fetches the new host's pair endpoint.

## Build artifacts

```
dist/
  chrome/                # load unpacked in Chrome/Edge; zip for Web Store
    manifest.json
    background-sw.js
    offscreen.html
    offscreen.js
    popup.html
    popup.js
    popup.css
    assets/icon-{16,48,128}.png
  firefox/               # load as temporary add-on; zip for AMO
    manifest.json
    background-event.js
    popup.html
    popup.js
    popup.css
    assets/icon-{16,48,128}.png
```

## Status — v1 in progress

- ✅ Scaffold + build pipeline
- ✅ Cross-browser manifests
- ✅ Pairing + status popup
- ✅ Cert-acceptance onboarding
- ⏳ Web Store / AMO accounts (none registered yet)
- ⏳ Real icon art (current `assets/icon-*.png` are placeholders)
- ⏳ Production relay hostname (find/replace in manifests + `lib/relay.ts`)

## Replace before Web Store / AMO submission

```
extension/assets/icon-{16,48,128}.png   ← real branded art
extension/manifest/manifest.*.json      ← swap counter.app placeholder for real host
extension/src/lib/relay.ts              ← same swap
```
