# Realtime data on Riot's API surface — the honest picture

**Updated:** 2026-05-03
**TL;DR:** The only zero-middleman path to realtime League of Legends data is reading `127.0.0.1:2999/liveclientdata/allgamedata` on the player's own machine. Everything else is either delayed (Spectator-V5, being deactivated), gated (GRID/RED, esports-only), or doesn't exist (no public live-game stream).

---

## The static vs. live distinction

It matters because they look like the same problem but have completely different solutions.

| | Static client data | Live game telemetry |
|---|---|---|
| Examples | Champion stats, item costs, ability tooltips, splash art, minimap icons | Current player positions, real-time gold, ability cooldowns mid-fight |
| Where it lives | Bundled in every `League of Legends.exe` install | Only on the player's machine + Riot's internal spectator infra |
| Public access | Yes — via patcher manifests | No — by intentional anti-cheat policy |
| Scrapeable third-party | CommunityDragon (RAW + CDN), Data Dragon, ddragon.leagueoflegends.com | None exist |
| Our path | Mirror it ourselves into `/public/assets/lol/` (CDragon-style ownership) | Counter Companion on the player's machine |

CommunityDragon's "we operate in a gray area" disclaimer applies only to static assets. They have not solved live telemetry. No one has, because Riot does not publish a feed.

## Why no public live feed exists

This is a deliberate Riot policy, not an oversight:

- **Stream sniping would destroy ranked.** If the live state of any in-progress ranked match were publicly streamable, viewers could feed information to one team in real time. Riot engineered the API specifically to make this impossible.
- The Spectator-V5 endpoint was the only one that came close (~3-min delay). On **2025-10-17** Riot DevRel announced ([@RiotGamesDevRel](https://x.com/RiotGamesDevRel/status/1979263978787246391)) that Spectator-V5 is being **deactivated** to support the new Streamer Mode anonymity rollout. As of 2026-05-03, no V6 has been announced. Match-V5 (post-game) and leaderboards survive.

## The four candidates we evaluated

### 1. Spectator-V5 — DEAD
- 3-minute delay was non-configurable, non-waivable
- Endpoint being deactivated; no replacement announced
- We use Match-V5 fallback today; this stays useful as post-game

### 2. GRID.gg Live Data — NOT FOR US
- Indie-tier "Open Access" covers **CS2 + Dota 2 only** ([grid.gg/open-access](https://grid.gg/open-access/)). LoL is enterprise-only.
- Coverage is **tournament feeds**, not solo queue ([grid.gg/get-access](https://grid.gg/get-access/))
- Esports broadcasters / betting / fantasy clients only
- A user's ranked game is not in their dataset

### 3. Riot Esports Data (riotesportsdata.com) — NOT FOR US
- Distributed via GRID, inherits same gating
- "18 leagues supported" = LCS/LEC/LCK/LPL etc. — **only sanctioned esports**
- Confirmed not available for consumer apps

### 4. Live Client Data API — VIABLE
- Documented at [developer.riotgames.com/docs/lol](https://developer.riotgames.com/docs/lol)
- `https://127.0.0.1:2999/liveclientdata/allgamedata` exposes all 10 players
- **Local-only by design** — Riot rejects non-localhost requests
- Returns: `championName, level, team, scores {kills, deaths, assists, creepScore, wardScore}, items[], summonerSpells, runes (keystone+secondary tree only), skinID, isDead, respawnTimer, position`
- **Not exposed for opponents:** `currentGold`, exact XP curve, ability cooldowns, summoner-spell cooldowns
- Full state (`activePlayer`) is local-player-only — Riot's anti-cheat guardrail

## Two compliance surfaces — don't conflate them

There are two separate restriction sets and they apply to different product shapes.

### 1. In-game overlays (Overwolf-style, rendered on top of the live client)
[Riot's compliance guide for Overwolf apps](https://dev.overwolf.com/ow-native/guides/game-compliance/riot-games/) lists what's forbidden when your app renders inside the game viewport:

- ❌ Enemy ability cooldown timers
- ❌ Enemy summoner-spell cooldown timers
- ❌ Ult timers ("strictly forbidden, unfair advantage")
- ❌ Power-spike push-notifications ("enemy hit 6")
- ❌ Action-dictating alerts ("gank top now")
- ❌ Display of non-party summoner names in ranked champ select (must show "Ally 1")

These rules exist because an in-game overlay is competing for the same eyeballs as the game itself — it's effectively a heads-up display.

### 2. Web/mobile apps the user voluntarily opens in a side window
**Different product class, much looser rules.** Op.gg, Mobalytics, Blitz, Porofessor all run websites that show power spikes, build counters, and live enemy comp analysis. None have been actioned by Riot. The general policy still applies ("no unfair advantage"), but a side-window webapp surfacing player-decided insights is the same shape as those existing services. Counter is in this category.

### What this means for Counter
- ✅ **Counter webapp** (browser/mobile, side-window): PowerSpikes, MacroCallBanner, ObjectiveTimers, build coaching — all fine. Same posture as op.gg.
- ✅ **Counter Companion** (the data-pumping desktop process): not surfacing anything — purely a data pipe.
- ❌ **Hypothetical in-game overlay** (Overwolf wrap, Phase 3 in companion roadmap): would have to obey the strict list.

The dangerous-field worry is moot anyway: Live Client Data API does not expose enemy ability cooldowns, summoner-spell cooldowns, or ult timers. The data we have (items, level, K/D/A/CS, position, scores) is exactly what existing webapps already show.

## How competitors actually work

They are all desktop apps reading the local game client. Confirmed:

| App | Stack | Notes |
|---|---|---|
| Mobalytics Companion | Overwolf | [link](https://mobalytics.gg/blog/lol-how-to-use-mobalytics-overlay-live-companion/) |
| Blitz.gg | Standalone Electron | No Overwolf required |
| Porofessor | Overwolf | [link](https://www.overwolf.com/app/trebonius-porofessor.gg). Their public web spectator product runs on Spectator-V5 and is 3-min delayed. |
| OP.GG | Standalone Electron | [link](https://www.overwolf.com/app/opgg-electron-app) — explicitly flagged "no Overwolf required" |
| iTero | Standalone Electron | [link](https://www.itero.gg/articles/what-is-the-best-league-of-legends-companion-app-in-2025) |
| U.GG Live | Web (Spectator-V5) | 3-min delay |

## Decision

**We build Counter Companion** — a small standalone Electron tray app that:
1. Polls `127.0.0.1:2999/liveclientdata/allgamedata` at 1-2 Hz on the player's machine
2. Pushes diff frames over WSS to our Vercel relay
3. Cloud relay broadcasts to the web/mobile view via SSE
4. Web/mobile view shows live coaching with **post-game framing** for compliance

Rejected paths and why:
- "Wait for Riot to ship a v6 realtime API" — no signal they ever will, given anti-cheat priorities
- "Use a middleman like Porofessor scraping" — they don't have it either; they're an overlay, not a stream
- "Apply for esports access" — wrong product, wrong scale, wrong access scope
- "Reverse-engineer the spectator binary protocol" — ToS violation, gets API key revoked, Riot rotates encryption per patch

## What we own going forward

| Surface | Source | Status |
|---|---|---|
| Static assets (icons, items, champs) | Mirror CommunityDragon / Data Dragon to `/public/assets/lol/` | TODO — task #9 |
| Live in-game telemetry | Counter Companion → cloud relay → SSE | TODO — task #8 (Phase 0) |
| Post-game match data | Match-V5 (already wired) | DONE |
| Match history strip | Match-V5 (already wired) | DONE |
| Champion select state | LCU WebSocket (companion Phase 1) | LATER |

## Sources (verified 2026-05-03)

- [Riot Developer Portal — keys, rate limits, policies](https://developer.riotgames.com/docs/portal)
- [Riot DevRel — Spectator-V5 deactivation announcement](https://x.com/RiotGamesDevRel/status/1979263978787246391)
- [Live Client Data API endpoints + sample JSON](https://developer.riotgames.com/docs/lol)
- [Riot Developer Policies (general)](https://developer.riotgames.com/policies/general)
- [Overwolf Riot Games compliance — feature blacklist](https://dev.overwolf.com/ow-native/guides/game-compliance/riot-games/)
- [GRID Open Access tier](https://grid.gg/open-access/)
- [Riot Esports Data product overview](https://riotesportsdata.com/en-us/product-overview/)
- [Anonymizing Your Riot ID](https://support-leagueoflegends.riotgames.com/hc/en-us/articles/45805996869907-Anonymizing-Your-Riot-ID)
- [Production Key Applications](https://support-developer.riotgames.com/hc/en-us/articles/22801383038867-Production-Key-Applications)
- [LeagueClientLiveDataApi reference wrapper](https://github.com/Plutokekz/LeagueClientLiveDataApi)
