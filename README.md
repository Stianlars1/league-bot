# Peeked — Live Draft Coach

Live tactical recommendations against your opponent's team in **League of Legends** and **Dota 2**, powered by official public APIs (Riot Games, Stratz, OpenDota).

Drop in your Riot ID or Steam account ID. While you're in a match, the app pulls the live composition every 15 seconds and prescribes:

- **Defensive items** — Magic Resist vs AP, armor vs AD, antiheal vs healing comps
- **Offensive items** — %HP damage vs tanks, MKB vs evasion, antishield
- **Strategy** — engage windows, scaling vs early-game power, splitpush response
- **Objective priority** — what to force, what to give up

Designed multi-game from day 1 — adding Deadlock or another MOBA is a new adapter, not a refactor.

---

## Stack

- **Next.js 16** (App Router, Turbopack, Fluid Compute on Vercel)
- **CSS Modules** (no Tailwind) with shadcn-style HSL design tokens
- **Motion** (Framer Motion v12) and **GSAP** for animation
- **Drizzle ORM** + **Neon Postgres** (Vercel Marketplace)
- **SWR** for client polling
- **TypeScript strict**, ES2022 target

## Architecture

```
src/lib/games/
├── adapter.ts           GameAdapter + Recommender interface
├── types.ts             Match, Participant, Character, Recommendation
├── registry.ts          gameId → adapter
├── league/
│   ├── adapter.ts       Riot API integration
│   ├── recommender.ts   League rules engine
│   ├── data.ts          Curated champion catalog (~100 champs)
│   ├── data-dragon.ts   Riot static asset CDN
│   └── riot-api.ts      Account-v1 + Spectator-v5 client
└── dota/
    ├── adapter.ts       Stratz + OpenDota integration
    ├── recommender.ts   Dota rules engine
    ├── data.ts          Curated hero catalog (~125 heroes)
    ├── stratz-api.ts    Stratz GraphQL client (live match)
    └── opendota.ts      OpenDota REST client (profile + heroes)
```

The normalized `Match` type abstracts 5v5: teams, participants, characters, items, runes. Both adapters map their native shape into this — UI and recommender shells are game-agnostic.

## Development

```bash
pnpm install
cp .env.example .env.local   # then fill in keys
pnpm db:generate             # regenerate migrations if you edit schema.ts
pnpm db:push                 # push schema to your Neon DB
pnpm dev
```

## Required environment variables

| Var | Source | Notes |
|---|---|---|
| `DATABASE_URL` | Vercel Marketplace → Neon Postgres | Auto-provisioned when you install Neon |
| `RIOT_API_KEY` | https://developer.riotgames.com | Personal dev key expires every 24h |
| `STRATZ_API_KEY` | https://stratz.com/api | Free tier, sign in with Steam |
| `OPENDOTA_API_KEY` | https://www.opendota.com/api-keys | Optional, raises rate limit |
| `RIOT_REGIONAL_CLUSTER` | `americas` / `europe` / `asia` / `sea` | Default `europe` |
| `CRON_SECRET` | `openssl rand -hex 32` | Authenticates `/api/cron/*` |

## Rate-limit strategy

- **30 s server cache** of live match per player (`match_cache` table)
- **In-process pending-promise dedupe** so concurrent requests for the same player coalesce into a single upstream call
- **15 s polling** per client — well under per-user rate limits for Riot, Stratz, and OpenDota
- Daily cron at `/api/cron/refresh-catalog` re-seeds the static character catalog

## Deploying to Vercel

```bash
pnpm dlx vercel link
pnpm dlx vercel env add RIOT_API_KEY
pnpm dlx vercel env add STRATZ_API_KEY
pnpm dlx vercel env add OPENDOTA_API_KEY
pnpm dlx vercel env add CRON_SECRET
# Install Neon Postgres from the Vercel Marketplace — DATABASE_URL is auto-provisioned
pnpm dlx vercel deploy --prod
```

`vercel.json` registers a daily cron at 06:00 UTC to refresh the character catalog.

## Caveats (real-world)

- **Riot Spectator-v5** has a built-in ~3-minute delay per Riot policy. Recommendations appear once data unlocks, not at champ select.
- **Stratz live coverage** is best-effort — some public matches may not appear immediately.
- **Curated metadata** for champions/heroes is hand-coded in `data.ts` files. Extend over time; the recommender degrades gracefully when meta is missing (low-severity fallback hint).
- **No third-party scraping**. All data is from sanctioned APIs (Riot Data Dragon, Stratz, OpenDota).

## License

Source code under MIT. Game assets and trademarks belong to their respective owners (Riot Games, Valve).
