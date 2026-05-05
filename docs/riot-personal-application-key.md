# Riot Personal Application Key — application checklist

> **Status:** DRAFT. Needs your review + fills before submitting to Riot.
> **Why this exists:** A development key expires every 24 hours. A Personal
> Application Key (PAK) does not — it's the only way to stop the daily
> rotation dance. Approval timeline per Riot is 1–3 weeks.
> **Submit at:** <https://developer.riotgames.com/app-type> → "Personal API key".

## Required fields

| Field | Draft answer | Status |
|---|---|---|
| Application name | Counter | OK |
| Application URL | `https://counter.app` | **BLANK** — confirm this is the real production URL, or supply the real one. Riot rejects PAK applications without a working URL. |
| Logo | `extension/assets/icon-128.png` | **PLACEHOLDER** — current art is a Pillow-generated dark cyan square. Replace before submit. |
| Description | See below | DRAFT — read + edit |
| Privacy Policy URL | — | **MISSING** — required by Riot. Needs to be written + hosted on the same domain. |
| Terms of Service URL | — | **MISSING** — required by Riot. Same as above. |
| Anticipated user base | <100 in pilot, growing | DRAFT |
| API call rate estimate | ~1 call per 15s per active session (Spectator-V5 polling); plus on-demand Match-V5 history reads. ~5–10 reqs/s peak across the user base. | DRAFT — adjust to your real expectation |
| Will the application be open-source? | _pick_ | **BLANK** — yes/no |

## Description (draft — factually accurate to what Counter does today)

> Counter is a real-time match analysis web app for League of Legends
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

These are also tracked in `HANDOFF.md`:

1. **Hosted production URL.** `counter.app` is a placeholder string in the
   extension manifests + `relay.ts`. Riot needs a working URL to review.
2. **Privacy policy.** Hosted on the same domain. A generator-based policy
   is acceptable to start (privacypolicies.com / iubenda / a hand-written
   one); link must resolve.
3. **Terms of service.** Same shape as above. Riot accepts straightforward
   "use at your own risk, we don't store more than X" wording.
4. **Real logo art.** Replace `extension/assets/icon-128.png` placeholder
   before submit; same icon should also appear at the application URL.

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
