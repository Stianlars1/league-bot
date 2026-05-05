# HANDOFF — 2026-05-03

## Where we are

After deep research into the Riot API surface for true realtime data, we made a fundamental architectural pivot. The session replaced the broken "cloud-only realtime via Spectator-V5" premise with **Counter Companion** — our own desktop process that reads Riot's `Live Client Data API` on the player's machine and streams the data to our cloud, with zero middleman.

Background: see `docs/research-realtime.md` (the full research trail and decision matrix) and `docs/companion-app.md` (architecture spec + phase plan).

## What shipped this session

### Counter Companion Phase 0 — working end-to-end
- `companion/poll.ts` — Node poller. Polls `https://127.0.0.1:2999/liveclientdata/allgamedata` at 1Hz, only pushes when game-clock tick advances. Self-signed cert handled via `node:https` directly. Token persisted to `~/.counter/companion.json`.
- `companion/package.json`, `companion/README.md`
- Root script: `pnpm companion:dev`
- Cloud relay (in-memory, Phase 0 — needs Vercel Marketplace Postgres or Upstash for production):
  - `src/lib/companion/{types,store,pair-codes}.ts`
  - `POST /api/companion/pair` — generates code + token
  - `POST /api/companion/claim` — companion exchanges code → token
  - `POST /api/companion/ingest` — companion pushes frames (Bearer auth)
  - `GET /api/companion/stream` — SSE, replays latest on connect, broadcasts new frames
- Web UI:
  - `/companion` page with full pairing flow
  - `src/components/companion-panel.tsx` — pairing UI + live frame display + per-player rows
  - Header now includes a Companion nav link

### Verification
End-to-end smoke test passed (curl):
```
PAIR  → { code, token, expiresAt }
CLAIM → { token } (matches)
INGEST → { ok: true }
STREAM → event: frame  data: {...}
```

### Other changes
- Landing page (`game-picker.tsx`) re-framed to surface the realtime/cloud distinction honestly. New CTA pulse-dot pointing to `/companion`.
- League/Dota tab caveats updated: Spectator-V5 deactivation + Companion as the realtime path.
- Dota adapter no longer throws on missing STRATZ key — gracefully returns null active-match. STRATZ replaced as a hard dependency; Dota live ships via Counter Companion + GSI in Phase 1.

## Session 2 (2026-05-03) — Phase 0 wired into the live product

The live page now consumes Companion frames end-to-end. Three pieces shipped:

1. **`src/lib/games/league/live-client-converter.ts`** — converts Riot Live Client `allgamedata` → normalized `Match`. Resolves focused player via `activePlayer.summonerName` / `riotId` / route `name` hint, orients teams ally-first, copies per-player KDA/CS/level, and aggregates the events log into team scores (kills + towers/inhibs by structure-owner inversion + drakes/heralds/barons by killer-team).
2. **`src/app/api/match/from-companion/route.ts`** — reads the latest buffered frame for a token, runs it through the converter + `leagueRecommender.{recommend,allyActions,plan,intel}`, returns the same `LivePayload` shape the existing UI consumes.
3. **`src/hooks/use-live-match.ts`** + LiveView/Header — when `localStorage["counter:companion-token"]` is present, hook subscribes to `/api/companion/stream` and triggers a `mutate()` on the from-companion SWR on every `frame` event. Companion data wins when it has a real match; Spectator-v5 polling stays on as fallback. Header shows "Live · via Companion" pill (uses `--data` cyan) and meta swaps to "Streaming · 1Hz from your machine".

Verified end-to-end with curl: pair → ingest synthetic 9:20 League frame → from-companion returned `winProbability: ally 56 / enemy 44`, macro call "DRAGON IN 1:00", 6 power spikes, 5 lane matchups, 5 ally actions, 2 recommendations. Team scores aggregated correctly from events (3 ally kills + 1 tower + 1 drake vs 1 enemy kill + 1 tower).

## Session 3 (2026-05-03) — `/companion` honestly reframed; rules added

User flagged two things on the `/companion` surface:
1. The "Expires in 4:59" pairing-code countdown wasn't ticking.
2. The page was leaking the developer flow ("run `pnpm companion:dev` in
   another terminal") to non-technical customers.

The first attempt at this session over-shipped: it invented a waitlist
component, a `/api/companion/notify` endpoint, "downloadable app coming soon"
hero copy, and a concrete Electron Phase 1 build plan in docs — all unrequested.
The user pushed back. Everything invented was reverted; the actual fixes
shipped clean.

### What shipped (kept)

- **Countdown ticks.** `companion-panel.tsx` promotes "current time" into state
  with a `setInterval` keyed on `codeExpiresAt`. When the TTL elapses with no
  frames received, status reverts to `unpaired` so the user can generate a new
  code without reload.
- **Token persistence deferred to first frame.** A user who clicks "Generate
  code" and then closes the tab no longer leaves a dead token in localStorage
  that would mislead the live-view header into showing "Live · via Companion".
- **CLI flow hidden from non-technical visitors.** The pairing button and
  pnpm instructions are inside a `<details>` block labeled "I'm a developer or
  contributor — show the manual pairing flow." Customers never see the pnpm
  flow unless they explicitly opt in.
- **`/companion` page reframed honestly** — eyebrow `Developer preview`,
  no roadmap promises in copy, no email capture. Notes section explicitly
  states the customer distribution method is being evaluated.
- **Landing page CTA demoted** — the gradient-bordered pulse-dot CTA card is
  gone; replaced with a small dashed "DEV · Counter Companion · realtime path,
  in development" row. Tab-caveat copy and page lede no longer commit to a
  distribution form.
- **Header nav** relabeled `Companion BETA` so the top-level link doesn't
  advertise a finished surface.
- **Direction recorded (not built):** browser extension is the lead candidate
  for customer distribution as of 2026-05-03. Recorded in
  `docs/companion-app.md` Phase 1 section alongside the option list (extension
  vs native vs hybrid vs stream-and-OCR) and the trade-offs. **No build plan
  written.** That happens in the session that picks the option.
- **`RULES.md` added** at repo root, imported by `AGENTS.md` (which CLAUDE.md
  already imports). Rules forbid inventing features, committing to directions,
  writing roadmap copy, or adding files/endpoints/dependencies the user didn't
  scope. Written specifically against the failure mode of this session.

### What was reverted (do not re-introduce without explicit ask)

- `src/components/companion-waitlist.tsx` + `.module.css` — deleted.
- `src/app/api/companion/notify/route.ts` — deleted.
- `data/companion-waitlist.json` — deleted; `/data/` line removed from `.gitignore`.
- "Coming soon, get notified" hero copy in `companion/page.tsx` — reverted.
- "What you get when the app ships" promise list — reverted.
- Concrete Electron Phase 1 build plan in `docs/companion-app.md` — reverted
  to a thin direction-recording section.
- HANDOFF "task #10 Phase 1 Electron build pipeline" — removed; the actual
  next item is the extension research below.

### Files touched

```
src/components/companion-panel.tsx           (countdown fix + dev disclosure + first-frame persist + reframed title/lede)
src/components/companion-panel.module.css    (devDisclosure / devSummary / devBody / hintMuted)
src/app/companion/page.tsx                   (honest hero + notes; waitlist removed)
src/components/game-picker.tsx               (lede + caveats no longer commit to "desktop app"; CTA demoted)
src/components/game-picker.module.css        (companionRow + companionPill replace companionCta)
src/components/header.tsx                    (Companion → Companion BETA badge)
src/components/header.module.css             (.navLinkBadge)
docs/companion-app.md                        (Phase 1 = direction recorded, no build plan; extension is lead candidate)
companion/README.md                          (reframed; Phase 1 section points at the direction question)
RULES.md                                     (new — engagement rules)
AGENTS.md                                    (added @RULES.md import)
HANDOFF.md                                   (this section)
```

## Session 4 (2026-05-03) — extension v1 scaffold landed

User picked browser extension as the v1 distribution path (over native app
or hybrid) after the cert-warning click was confirmed acceptable. Spec lives
in `docs/plans/extension-v1.md` (approved as written). All four open questions
resolved before code:
- Relay host: placeholder `https://counter.app` to find/replace later
- Token revocation: asymmetric (each surface clears its own; no new server endpoint)
- Display name: "Counter Companion"
- Icon: placeholder PNGs, swap before public store submission

### What shipped

- **`extension/`** — full scaffold sibling to `companion/`:
  - `package.json` (deps: esbuild + tsx + typescript + @types/{chrome,firefox-webext-browser,node})
  - `tsconfig.json`, `esbuild.config.ts` (single-script build → `dist/chrome/` + `dist/firefox/`)
  - `.npmrc` with `ignore-workspace=true` (extension is NOT a pnpm workspace member; install with `--ignore-workspace`)
  - `.gitignore` (dist, node_modules, .zip)
  - `README.md` with load-unpacked instructions for all three browsers
- **Manifests** (`extension/manifest/manifest.{chrome,firefox}.json`):
  - MV3, both
  - Chrome: `service_worker` + `offscreen` permission
  - Firefox: `background.scripts` event-page + `gecko.id`
  - `host_permissions`: `127.0.0.1:2999`, `counter.app` (placeholder), `localhost:3000` (dev)
- **Shared `src/lib/`** modules:
  - `log.ts` — scoped console logger
  - `storage.ts` — cross-browser `chrome.storage.local` wrapper (uses `globalThis.browser ?? chrome`)
  - `relay.ts` — `RELAY_HOST` constant + `ingestFrame` + `claimPairing` (calls existing `/api/companion/{ingest,claim}` — no server changes)
  - `pair.ts` — token storage + `pairWithCode` + `unpair`
  - `cert-probe.ts` — `probeLiveClient()` returns true if cert is accepted
  - `poll.ts` — port of `companion/poll.ts` (1Hz fetch loop, only pushes on game-clock tick advance)
- **Background entries**:
  - `background-sw.ts` (Chrome/Edge) — owns offscreen-doc lifecycle; ack's keepAlive heartbeat
  - `offscreen.html` + `offscreen.ts` (Chrome/Edge) — hosts the actual poll loop; pings SW every 25s
  - `background-event.ts` (Firefox) — runs the poll loop directly in the event page (no offscreen needed)
- **Popup** (`popup.html` + `popup.ts` + `popup.css`):
  - DOM-builder pattern (no innerHTML — popup is XSS-proof regardless of copy source)
  - Five view states: loading / unpaired / pair-form / needs-cert / paired
  - Cert acceptance card with "Open the trust prompt →" button (opens `https://127.0.0.1:2999/liveclientdata/allgamedata`)
  - Live frame counter, last-frame age, game time, player count
  - "Unpair this browser" link in the footer
- **Root `package.json`** — added `extension:install`, `extension:build`, `extension:watch` scripts
- **Root `.gitignore`** — covers `/extension/dist/` and `/extension/node_modules/`
- **Root `tsconfig.json`** — excludes `extension` and `companion` so Next.js tsc doesn't pull in extension types

### Verified

- `pnpm extension:build` produces both `dist/chrome/` and `dist/firefox/` cleanly
- `pnpm exec tsc --noEmit` on root: clean
- `cd extension && pnpm exec tsc --noEmit`: clean
- All manifest-referenced files exist in both dist subdirs

### Session 4 polish (added on top of the v1 scaffold)

- **Runtime-state persistence** (`extension/src/lib/runtime-state.ts`) — pushedCount and the last successful push tick are persisted to `chrome.storage.local` on every push event. `offscreen.ts` and `background-event.ts` hydrate from it on startup, so Chrome's SW lifecycle (~30s idle teardown) no longer drops the user's "Pushed" counter to 0 mid-session. The noisy `frameCount` diagnostic is allowed to reset since the popup never shows it.
- **Better pair errors** — `claimPairing` now returns a discriminated union (`network`, `invalid-code`, `server-error`, `malformed-token`) and `pairWithCode` maps each to a specific user-facing message: wrong/expired vs network unreachable vs 5xx vs malformed response.
- **Dev host-override input** — small `<details>` "Advanced — change relay host" disclosure in the unpaired / needs-cert / paired views. Replaces the previous "open SW DevTools console and run chrome.storage.local.set..." dance. Validates URL shape (must parse, must be http/https) before saving. Footer "→ host" label refreshes after save.
- **Popup bootstraps from persisted state** — `loadRuntimeState()` runs before any view renders, so reopening the popup no longer flashes "—" while waiting for the background to reply. Last-known stats are visible immediately; live updates overwrite as they arrive.

### NOT yet verified (needs your hands in browsers)

- Loading the unpacked extension in Chrome / Edge / Firefox
- Popup renders correctly across browsers
- Pair flow against `localhost:3000` end-to-end (dev relay override needed: in
  the extension SW DevTools console, `chrome.storage.local.set({ relayHost: "http://localhost:3000" })`)
- Cert acceptance dance actually unblocks `fetch()` in each browser
- Frames flow through to `/api/companion/ingest` once a League match is running

## What's NOT done yet

### Highest leverage to do next
1. **In-browser smoke test of the extension.** Chrome on macOS done in
   Session 5 (popup + page bugs surfaced and fixed). Edge + Firefox not yet
   tested. Same load-unpacked instructions in `extension/README.md`.
2. **Production hostname find/replace.** When the production deployment
   exists, swap `https://counter.app` in:
   - `extension/manifest/manifest.chrome.json` (host_permissions)
   - `extension/manifest/manifest.firefox.json` (host_permissions)
   - `extension/src/lib/relay.ts` (`DEFAULT_HOST`)
3. **Real icon art.** Current `extension/assets/icon-{16,48,128}.png` are
   Pillow-generated placeholders (dark cyan square with a dot). Swap before
   any Web Store submission.
4. **Store accounts.** None registered yet. See
   `docs/plans/extension-v1.md` "Store accounts" table.
5. **Production storage swap.** Pre-existing item: in-memory `frames` and
   `pending` (`src/lib/companion/store.ts`, `pair-codes.ts`) only work on a
   single Fluid Compute instance.

### Tasks left in the queue
- **#3** Clickable history cards + `/match/[game]/[matchId]` route. Match-V5-by-ID is already wired in `src/lib/games/league/riot-api.ts`.
- **#5** WoW game support — Battle.net OAuth + Raider.IO scaffold. New game adapter under `src/lib/games/wow/`. `GameId` type needs `| "wow"`. Pre-fight features (M+ key prep, gear/talent delta, comp scoring); live in-fight via Warcraft Logs Companion uploader (Phase later).
- **#6** `pnpm refresh-key` helper. Playwright script that opens dev portal, user does 2FA, scrapes new key into `.env.local`. Plus apply for Personal Application Key (non-expiring) in parallel.
- **#9** Mirror Community Dragon assets to `/public/assets/lol/`. CDragon proves we can self-host static assets — we should, for uptime + control. Build/cron job pulls icons/items/runes/objectives.

### Companion roadmap (from `docs/companion-app.md`)
- **Phase 1**: Downloadable Electron app, code-signed Mac+Windows binaries via `electron-builder`, auto-update via `electron-updater`. Dota GSI mode included. Concrete build plan now lives in `docs/companion-app.md` "Phase 1 — concrete build plan".
- **Phase 2**: Optional `ow-electron` wrap for in-game overlay (would inherit Riot/Overwolf compliance restrictions — not Phase 0/1 concern).

## Compliance clarification (important)

A misconception we corrected mid-session: Riot's strict feature blacklist (no enemy cooldowns, no ult timers, no "gank now" alerts) applies **to in-game overlays**, not to a webapp the user voluntarily opens in a separate window. Counter is in the same product class as op.gg, mobalytics.gg, blitz.gg websites — all of which surface power spikes, lane matchups, and live comp analysis without issue. Full Match Intel suite stays in the live view; no demotion to post-game.

Also: Live Client Data API doesn't expose enemy ability cooldowns, summoner-spell cooldowns, or ult timers anyway. Riot's anti-cheat guardrail. We have items + level + K/D/A/CS + position + scores. That's the full set.

## How to run the new realtime path

```bash
# Terminal 1
pnpm dev                      # webapp on :3000

# Terminal 2 (start a League game first, or just to test the wire)
pnpm companion:dev            # follow the prompt to paste pairing code

# Browser
open http://localhost:3000/companion
# Click "Connect Companion" → copy the 6-char code → paste into companion prompt
# Once paired, frames appear in the panel as the game ticks
```

## Files touched

Session 1:
```
docs/research-realtime.md                  (new)
docs/companion-app.md                      (new)
companion/                                 (new)
  package.json
  poll.ts
  README.md
src/app/api/companion/                     (new)
  pair/route.ts
  claim/route.ts
  ingest/route.ts
  stream/route.ts
src/lib/companion/                         (new)
  types.ts
  store.ts
  pair-codes.ts
src/app/companion/                         (new)
  page.tsx
  companion.module.css
src/components/
  companion-panel.tsx                      (new)
  companion-panel.module.css               (new)
  game-picker.tsx                          (re-framed copy + Companion CTA)
  game-picker.module.css                   (CTA styles)
  header.tsx                               (Companion nav link)
  header.module.css                        (nav link style)
src/lib/games/dota/adapter.ts              (graceful STRATZ-missing fallback)
package.json                               (added companion:dev script)
```

Session 2:
```
src/lib/games/league/live-client-converter.ts   (new — Live Client → Match)
src/app/api/match/from-companion/route.ts       (new — converted LivePayload)
src/hooks/use-live-match.ts                     (added companion SWR + SSE refetch)
src/components/live-view.tsx                    (passes viaCompanion to Header, swaps meta)
src/components/header.tsx                       (viaCompanion prop + "via Companion" label)
src/components/header.module.css                (data-via-companion pill style)
HANDOFF.md                                      (this file)
```

## Session 5 (2026-05-03 evening) — extension popup + companion page bug fixes

In-browser Chrome-on-macOS smoke test surfaced one real popup bug and three
secondary issues on the `/companion` page. All four fixed and verified.

### What was broken

1. **Popup pair-form view never appeared.** Clicking "Pair this browser →"
   called `chrome.tabs.create(...)` and *then* `setView({ kind: "pair-form" })`
   — but Chrome destroys the popup the instant focus shifts to the new tab,
   so the pair-form render never reached the screen. Reopening the popup
   landed back on "Not paired" with no input field anywhere.
2. **`/companion` page never acknowledged successful pairings.** The page's
   only "you're paired" signal was a frame arriving over SSE, which doesn't
   happen unless a League match is running. Result: the dead pairing code
   kept counting down for 5 minutes after the extension already claimed it.
3. **SSE error handler was loud and persistent.** `onerror` set "Stream
   interrupted — reconnecting" on every transient error and never cleared
   it, so a single Next.js HMR bounce stuck red text on screen permanently.
4. **Two strings on `/companion` assumed the only consumer was the CLI.**
   Disclosure body and per-code hint mentioned `pnpm companion:dev` as if
   the extension didn't exist.

### What shipped (two commits, pushed to origin)

**`aab360b` — fix(extension): preserve pair-form view across popup teardown**
- Split "show form" from "open tab": clicking "Pair this browser →" now only
  renders the pair-form. Inside that form is a new "Open companion page →"
  button — clicking *that* writes `pairInProgressAt` + the new tab id to
  `chrome.storage.local` *before* opening the tab.
- `bootstrap()` restores the pair-form view if a fresh (<10min)
  `pairInProgressAt` flag is present. Cancel clears the flag + closes the
  tab; successful pair clears the flag + closes the tab; Unpair clears the
  flag.
- Files: `extension/src/popup.ts` only.

**`be91420` — fix(companion): /companion page acknowledges pair + quieter SSE**
- New `notifyClaimed`/`subscribeClaim`/`isClaimed` channel in
  `src/lib/companion/store.ts`. `claim/route.ts` calls `notifyClaimed(token)`
  after `consumePairing` succeeds. `stream/route.ts` subscribes to claim
  notifications and replays `event: claimed` on connect for late subscribers.
- `companion-panel.tsx` handles the new `claimed` SSE event: clears
  `code`/`codeExpiresAt`, persists token to localStorage, holds status at
  `"waiting"`.
- Quieter EventSource error handling: clear on `onopen`, only surface error
  when `readyState === EventSource.CLOSED`. Eliminates the "Stream
  interrupted" noise from normal HMR reconnects.
- Disclosure body and per-code hint copy updated to acknowledge both
  extension and CLI consumers.

### Verified end-to-end on Chrome / macOS

- Pair flow: form survives popup-close, extension claims, `/companion` page
  drops the codeBlock immediately after claim.
- SSE quietness: stop dev server → no error on `/companion` page; restart →
  silently reconnects.
- Curl smoke for the new claim broadcast: pair → subscribe → claim → SSE
  emits `event: claimed`. Late-subscribe race (claim before subscribe) also
  works via `isClaimed` replay.
- `pnpm exec tsc --noEmit`: clean (root + extension).

### NOT verified this session

- Same flow in Edge / Firefox. Code paths (offscreen vs event-page) differ;
  Firefox in particular hasn't been touched this round.
- Cert-trust dance with an actual running League match (no game on the test
  Mac).

## Session 6 (2026-05-04 → 05) — air-tight counter loop, /match route, rebrand to Peeked

Single commit: `9e00c08 feat: rebrand Counter → Peeked + air-tight counter loop + /match route + refresh-key`. 43 files, +1090 / -269.

### Air-tightened the recommender (the original product idea, "live counter")

The audit found the recommender was reading enemy CHAMPION identity but never enemy LIVE STATE — a Soraka with 0/8 triggered the same antiheal recommendation as a 12/0 Soraka. Closed all 7 audit gaps:

- Live Client converter now extracts enemy items and estimates per-player gold (was 0 — Live Client only exposes activePlayer.currentGold).
- Spectator-V5 `inferPosition` extended: support tag/archetype → UTILITY (was JUNGLE-only via Smite).
- `recommender.ts` rationale strings now cite each threat's live KDA + " — fed" marker; severity bumps one step when any matched threat is fed.
- New `evaluateThreats` helper in `ally-actions.ts`; `pickWatchOut` and `profile()` topThreat picks favour highest threatScore (kills/assists/level/gold), not array order.
- Match-V5 adapter populates `Participant.items` + `itemImageUrls`; `CharacterCard` renders an item icons row.
- `Recommendation.rationale` cites real KDA / gold deltas, not just champion names.

### Clickable match history → `/match/[game]/[matchId]`

- New route at `src/app/match/[game]/[matchId]/page.tsx` reuses `convertMatchV5` (now exported from adapter).
- URL slug: `/match/league/EUW1_1234567890` (raw Riot ID; mirrors `/live/[game]/[id]` shape).
- Perspective: `?p=<puuid>` query param + fallback to participant[0].
- `MatchHistoryStrip` cards become Links when `gameId === "league"`.

### Renamed the product: Counter → Peeked

Brand pack arrived in `~/Downloads/unknown_lol/` (Final Handoff + Brand Guidelines). Followed Drops 01–04 verbatim, visual layer only. Highlights:

- `public/peeked-mark.svg` + `<PeekedMark variant="glyph|wordmark|lockup" live? />` in `src/components/peeked-mark.tsx`. Header + landing both use the lockup; landing has the blink cursor.
- `globals.css` :root replaced with the Peeked palette (lime brand, --warn, --mark-knockout, peeked-blink keyframes). Preserved `--radius-xl` as alias to `--radius-lg` for backward compat.
- `--font-display` now points at `var(--font-geist-mono)` so all `.headline` / `.title` consumers auto-flip.
- Hero: "Counter it live" → "Peek it live" (imperative, same rhetorical shape).
- Iconography: `app/icon.svg` + `icon.tsx` + `apple-icon.tsx` + `opengraph-image.tsx` via `next/og` ImageResponse — no new deps. Old `favicon.ico` removed.
- Radii sweep: hardcoded 4-8px → `var(--radius-md)` (=4px, tighter), 3px → `var(--radius-sm)` (=2px). 999px pills preserved per Drop 04 "confirm context".
- Voice sweep: `companion-panel` status `"Error"` → `"Stream lost"`. No `Loading…`/`Insights`/`Tracker` matches found.
- `package.json` name: `league-bot` → `peeked`. README H1 updated.

NOT touched per Drop 04 scope: `src/lib/games/**` rule strings (e.g. `Counter their silences` in dota recommender), `Counter-strategy` / `Counterplay` labels (gaming vocabulary, not brand), `extension/` (manifests + popup still say "Counter Companion" — separate rebrand), tests, Drizzle schema, internal docs (RULES/MEMORY/plans/companion docs).

### `pnpm refresh-key` helper (clipboard-flow, not Playwright)

Original Playwright approach blocked by Google's SSO automation check. Pivoted to clipboard flow:

- `scripts/refresh-riot-key.ts` opens `developer.riotgames.com/dashboard` in your default browser (existing session, no Google block, usually no 2FA), then polls `pbpaste`. Copy the RGAPI key and the script writes it to `.env.local`.
- `docs/riot-personal-application-key.md` — drafted application checklist for the non-expiring Personal Application Key, with the four blockers that must clear before submission (production URL, privacy policy, terms of service, real logo art).

### Other

- `extension/README.md` — replaced stale "open SW DevTools console + run `chrome.storage.local.set`" copy with the popup's "Advanced — change relay host" disclosure flow. Cross-browser, validates URL shape.

### Verified this session

- `pnpm exec tsc --noEmit` clean
- `pnpm build` passes (all routes, including new icons + OG)
- Smoke (curl): `/`, `/companion`, `/icon`, `/icon.svg`, `/apple-icon`, `/opengraph-image`, `/live/league/sample?mock=1`, `/match/league/junk` (404 path) all 200/404 as expected
- OG image renders as a real 1200×630 PNG
- Landing HTML shows `peeked` + `Peek it live`, no "Counter" leakage

### NOT verified this session

- Running League match through the full Live Client → Companion → /live pipe (no game on the test Mac)
- `pnpm refresh-key` end-to-end (needs your real Riot login + clipboard interaction)
- Edge / Firefox extension smoke test (deferred from session 5, still deferred)
- Any browser extension change for the rebrand (`extension/manifest/manifest.*.json` `name` is still "Counter Companion")
- Pre-existing `pnpm lint` failures (12 errors, all setState-in-effect / data-dragon empty interface) — none introduced by this session, none in lines I touched

## Pending items — per-item blockers (as of session 6)

Per RULES.md none of these were silently advanced. Each needs your input.

| Item | What it needs from you |
|---|---|
| Extension rebrand (Counter Companion → Peeked Companion) | Drop 04 was "src/ visual layer only". Extension manifests + popup copy still say "Counter Companion". Decision: separate rebrand session, or keep "Counter Companion" as the extension product name (sub-brand)? |
| Production hostname swap | The actual production URL. Today `https://counter.app` is a placeholder in `extension/manifest/manifest.{chrome,firefox}.json` + `extension/src/lib/relay.ts`. Now that the brand is Peeked, the URL is presumably `peeked.app` (per Drop 04 codebase references) — confirm and I'll do the swap. |
| Personal Application Key (PAK) submission | Four blockers in `docs/riot-personal-application-key.md` must clear: production URL hosted, privacy policy hosted, terms of service hosted, real logo art (current `extension/assets/icon-*.png` are Pillow placeholders). Logo blocker is now LESS severe — `public/peeked-mark.svg` is the real brand mark; same SVG can be used for the extension icon if you want. |
| Real icon art for extension popup | `extension/assets/icon-{16,48,128}.png` are Pillow placeholders. The Peeked mark SVG could be rendered to PNGs at those sizes. Decision: use the new mark, or a different extension icon? |
| Store accounts | User-action: Chrome Web Store ($5, Google account), Firefox AMO (free), Edge Add-ons (free, requires Microsoft Partner Center). Order of registration is your call. |
| Production storage swap | Architectural pick: Vercel Marketplace Postgres vs Upstash Redis — both noted in `docs/companion-app.md`. Both need credentials + schema. |
| Edge / Firefox extension smoke test | User-action, deferred. Load `dist/firefox/manifest.json` as temp add-on; `dist/chrome/` in Edge via `edge://extensions`. |
| Pre-existing lint failures | `pnpm lint` has 12 errors (setState-in-effect in companion-panel + use-ticking-time + use-live-match; empty interface in data-dragon; unused eslint-disable in icons.tsx). None blocking the build. Decide whether to fix in a cleanup pass. |
| `pnpm refresh-key` end-to-end smoke | Run it, log in to dev portal, copy your key, watch the script catch it. If selectors / clipboard pattern differ from what I wrote, I'll iterate. |
| **Older queue (unchanged)** | |
| #5 WoW game support | Major new feature. Battle.net app registration + OAuth credentials, decision on Raider.IO API key vs anonymous, decision on whether `GameId` adds `\| "wow"` or a parallel system. |
| #9 Mirror Community Dragon assets | New build/cron job. Decisions: refresh cadence, where to host (`/public/assets/lol/` vs blob storage), what subset of CDragon to mirror. |
