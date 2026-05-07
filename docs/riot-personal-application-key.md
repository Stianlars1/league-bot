# Riot Personal Application Key — application checklist

> **Status:** DRAFT. Needs your review + fills before submitting to Riot.
> **Why this exists:** A development key expires every 24 hours. A Personal
> Application Key (PAK) does not — it's the only way to stop the daily
> rotation dance. Approval timeline per Riot is 1–3 weeks.
> **Submit at:** <https://developer.riotgames.com/app-type> → "Personal API key".

## Required fields

| Field | Draft answer | Status |
|---|---|---|
| Application name | Peeked | OK |
| Application URL | `https://peeked.app` | OK once site is deployed |
| Logo | `extension/assets/icon-128.png` | OK — rendered from `public/peeked-mark.svg` via `pnpm extension:icons` |
| Description | See below | DRAFT — read + edit |
| Privacy Policy URL | `https://peeked.app/privacy` | OK once site is deployed (route in `src/app/privacy/page.tsx`) |
| Terms of Service URL | `https://peeked.app/terms` | OK once site is deployed (route in `src/app/terms/page.tsx`) |
| Anticipated user base | <100 in pilot, growing | DRAFT |
| API call rate estimate | ~1 call per 15s per active session (Spectator-V5 polling); plus on-demand Match-V5 history reads. ~5–10 reqs/s peak across the user base. | DRAFT — adjust to your real expectation |
| Will the application be open-source? | _pick_ | **BLANK** — yes/no |

## Description (draft — factually accurate to what Peeked does today)

> Peeked is a real-time match analysis web app for League of Legends
> players. A user enters their Riot ID; the app surfaces their current live
> match (via Spectator-V5 and the Riot Live Client Data API through a paired
> companion process running on the player's own machine) and renders
> tactical analysis based on the match state — enemy team composition,
> per-lane matchups, item-build recommendations that respond to the
> opponents' live KDA / level / item state, win-probability projections,
> and post-game match review via Match-V5.
>
> The app is read-only against Riot APIs. It does not modify, replay, or
> redistribute Riot data. It does not surface enemy ability cooldowns,
> summoner-spell timers, or ult timers (Riot's anti-cheat guardrail — the
> Live Client Data API doesn't expose those, and we don't attempt to
> reconstruct them).
>
> Stack: Next.js + Vercel for the web app, a small companion process on the
> player's machine for the Live Client Data API path, browser extension as
> the customer distribution. Data persistence: pairing tokens (anonymous,
> short-lived) and player metadata cache (Riot ID, region, recent match
> IDs).

## Endpoints used

For the "which endpoints does your app call" prompt:

- `account/v1/accounts/by-riot-id/{gameName}/{tagLine}` — resolve a Riot ID
- `spectator/v5/active-games/by-summoner/{puuid}` — live match poll
- `match/v5/matches/by-puuid/{puuid}/ids` — recent match list
- `match/v5/matches/{matchId}` — full match detail
- (No write/POST endpoints used.)

## Blockers — must clear before submission

The codebase blockers are now resolved (extension rebrand to `peeked.app`,
`/privacy` and `/terms` routes exist, brand-mark icon rendered from
`public/peeked-mark.svg`). What remains is user-side:

1. **Deploy `peeked.app`.** The three URL fields (Application URL,
   Privacy Policy URL, Terms of Service URL) all point at routes that exist
   in this codebase but won't resolve publicly until the site is deployed
   and the domain is pointed at it. Riot's reviewer clicks the URLs.
2. **Fill the `{{TODO: contact email}}` placeholder** in
   `src/app/privacy/page.tsx` and `src/app/terms/page.tsx`. Both pages will
   render the literal token until you replace it.
3. **Fill the `{{TODO: jurisdiction}}` placeholder** in
   `src/app/terms/page.tsx`. Pick the governing-law jurisdiction (your
   country / state) before deploying.
4. **Decide open-source yes/no** for the form field.
5. **Adjust the API call rate estimate** to your real expectation.

## What happens after approval

- Riot mails the new PAK in plain text.
- Replace `RIOT_API_KEY` in `.env.local` with the PAK once.
- `pnpm refresh-key` is no longer needed; the script + the entry in
  `package.json` `scripts` can be removed at that point. The PAK is permanent
  (modulo Riot's manual revocation if you misuse it).
- Update production env on Vercel: `vercel env rm RIOT_API_KEY production
  --yes && vercel env add RIOT_API_KEY production`.

## While waiting

- `pnpm refresh-key` once per 24h covers the dev key rotation. The helper
  opens the dashboard in your default browser (Google's SSO blocks
  Playwright/Chromium so we can't fully automate the login) and watches the
  clipboard — copy the RGAPI key on the dashboard and the script writes it
  to `.env.local` automatically.
