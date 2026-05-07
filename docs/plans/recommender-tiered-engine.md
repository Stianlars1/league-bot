# Recommender — tiered build engine (1 + 2 + 3)

## Context

The Peeked recommender today reads enemy *champions* and their innate tags
(AP / AD / CC / burst / healing) and fires 12 hardcoded rules. It does not
read the enemy's actual *items*, even though the data is in the `Match`
object. A 5/0 enemy AD champion who only bought Pickaxe escalates threat;
a 0/5 enemy AP champion with full burst items does not. Every enemy Ahri
gets the same recommendation regardless of whether she's at 1200 gold or
12000.

This plan upgrades the recommender to a three-layer engine that closes
that gap and aligns with the product promise: *based on the live state of
the opponents' builds, tell the user the best items to build to counter
them.*

### The three layers

- **Layer 1 — Item-aware rules.** Make the existing rule engine read
  enemy items and weight threat by item-completion / mythic / synergy.
  Same rule shape, anchored to live state. Ships first session.
- **Layer 2 — Curated counter-knowledge graph + per-champion paths.**
  A structured item database (built from Riot Data Dragon + hand-curated
  semantic tags), a counter-graph mapping threat-types to counter-items,
  and per-champion typical build paths. The recommender picks an
  *ordered* next item based on gold, current items, and enemy state.
  Ships across multiple sessions.
- **Layer 3 — Empirical aggregates from Match-V5.** A scoped data
  pipeline that ingests recent Master+ ranked games, aggregates winning
  builds per (champion, position, patch), and lets the recommender
  fall back to "what actually wins right now." Code scaffolded this
  arc, **dormant in dev** until a Riot Personal Application Key
  approves and a storage backend is picked.

### End-state architecture

```
                           ┌────────────────────────┐
                           │    Match (live state)  │
                           │  enemy items, KDA,     │
                           │  gold, levels, ...     │
                           └──────────┬─────────────┘
                                      │
                                      ▼
              ┌──────────────────────────────────────────┐
              │  Recommender pipeline (per request)      │
              │                                          │
              │  ┌──────────┐  ┌──────────┐ ┌─────────┐  │
              │  │ Layer 1  │→ │ Layer 2  │→│ Layer 3 │  │
              │  │ Live-    │  │ Curated  │ │ Empir.  │  │
              │  │ state    │  │ counter  │ │ data    │  │
              │  │ rules    │  │ graph    │ │ aggre-  │  │
              │  │          │  │ + paths  │ │ gates   │  │
              │  └────┬─────┘  └────┬─────┘ └────┬────┘  │
              │       └─────────────┴────────────┘       │
              │                     │                    │
              │                     ▼                    │
              │       Merge + rank + cite sources        │
              └──────────────────────┬───────────────────┘
                                     │
                                     ▼
                       Recommendation[] + AllyAction[]
                       with citations: "L1:rule-id" /
                                       "L2:counter-graph" /
                                       "L3:winrate(54%, n=2400)"
```

Every recommendation carries a `source` field naming which layer
generated it. UI can show "from live state" / "from counter graph" /
"backed by 2400 ranked games" so the user knows what's evidence-based
vs heuristic-based.

### "No guessing" constraint

The user has stated explicitly that recommendations *should not guess,
rely on no facts, or use imagination*. This constrains layer 2's
curation:

- Every counter-graph entry cites its source: Riot's official item
  description, the publicly documented item mechanic, or the publicly
  documented champion ability.
- Layer 2 does **not** ship "ChatGPT thinks X counters Y" entries.
- When layer 2 has no curated answer, recommender returns nothing for
  that slot rather than hallucinating one.
- Layer 3 is the only layer that can claim "this build statistically
  wins"; it cites win rate + sample size + patch in every output.

### What this plan does NOT touch

- `src/lib/games/dota/**` — Dota recommender stays as-is. The tiered
  engine is League-specific; Dota lights up later via STRATZ replacement
  / GSI per existing memory.
- `Match` / `Recommendation` / `AllyAction` core type shapes — extended
  with optional fields (source, citations) but back-compat preserved.
- The ingest cadence for layer 3 — covered at the architecture level
  here; production cron schedule + storage backend pick happen in a
  later session once PAK lands.

---

## Output contract (stable across all three layers)

The recommender output extends today's `Recommendation` and `AllyAction`
with provenance fields. Adding fields to existing types is back-compat;
no consumer breaks.

```ts
// src/lib/games/types.ts — extend (not replace)

export type RecommendationSource =
  | { layer: 1; ruleId: string }
  | { layer: 2; ruleId: string; cite: string }   // "Maw of Malmortius — Lifeline shield (Riot item description)"
  | { layer: 3; sampleSize: number; winRate: number; patch: string };

export interface Recommendation {
  // ... existing fields ...
  /** Which layer produced this, with citation */
  source?: RecommendationSource;
  /** When multiple layers fired, the ordered set of contributing sources */
  alsoFrom?: RecommendationSource[];
}

export interface AllyAction {
  // ... existing fields ...
  /** Ordered next-buy queue (layer 2+). Replaces `priority` once layer 2 ships. */
  buildPath?: BuildStep[];
  source?: RecommendationSource;
}

export interface BuildStep {
  itemId: string;             // Riot item ID (numeric string)
  itemName: string;           // "Mortal Reminder"
  itemImageUrl?: string;
  reason: string;             // "Counters enemy healing items"
  cost: number;               // total gold cost
  /** Earlier sub-components if buildable from current inventory */
  componentsOwned?: string[];
  /** Confidence: layer-1 = "rule"; layer-2 = "curated"; layer-3 = "empirical" */
  confidence: "rule" | "curated" | "empirical";
}
```

### Merge strategy at request time

When all three layers exist:

1. Layer 1 produces team-wide rule recommendations (always runs).
2. Layer 2 produces ordered build paths per ally, citing counter graph
   entries (runs when item DB is loaded).
3. Layer 3 produces empirical "this build wins X% in this matchup"
   suggestions per ally (runs when feature flag enabled and aggregates
   exist for the (champion, position, patch) tuple).

Merge:
- For each ally, layer 3's empirical result wins if (a) it exists,
  (b) sample size ≥ 30 games, (c) win rate ≥ 50%. Otherwise layer 2's
  curated path wins. Otherwise layer 1's rule-based single-item priority.
- Team-wide recs (layer 1 only) are always included.
- The UI surfaces the highest-confidence layer per slot but lists
  fallback layers in `alsoFrom` so users can compare.

---

## Layer 1 — Item-aware rules (first session)

**Goal:** make the existing 12 rules + threat scoring read enemy items.
Same rule shape, anchored to live state.

### Files

**New:**
- `src/lib/games/league/item-tags.ts` — fetches Data Dragon item data
  (already used by `data-dragon.ts`), indexes by item ID, and exposes a
  pure-function classifier:
  ```ts
  export interface ItemTag {
    id: string;
    name: string;
    cost: number;
    isMythic: boolean;
    isLegendary: boolean;
    isBoots: boolean;
    isComponent: boolean;
    statTags: Set<"AD" | "AP" | "MR" | "Armor" | "HP" | "Lifesteal" | "Omnivamp"
      | "Healing" | "Shielding" | "AntiHeal" | "ArmorPen" | "MagicPen"
      | "AttackSpeed" | "AbilityHaste" | "Tenacity" | "MovementSpeed"
      | "CriticalStrike">;
  }
  export function loadItemDb(version: string): Promise<Map<string, ItemTag>>;
  export function classifyItem(item: DataDragonItem): ItemTag;
  ```

  The `statTags` set is derived from Data Dragon's `tags` field
  (Riot-published) plus presence of specific stat keys (e.g.
  `description` contains "Grievous Wounds" → `AntiHeal`). Pure derivation
  from first-party data; nothing invented.

**Modified:**
- `src/lib/games/league/ally-actions.ts` — `evaluateThreats()` extends
  the threatScore formula:
  ```
  // Was:
  threatScore = kills*3 + assists - deaths*2 + level/4 + gold/1500
  // Becomes:
  threatScore =
    kills*3 + assists - deaths*2 + level/4 + gold/1500 +
    completedItemCount*2 +              // any non-component, non-boot item
    (mythicBuilt ? 5 : 0) +             // big jump when mythic completes
    (synergyMatched ? 3 : 0);           // e.g. Liandry+Rylai = poke synergy
  ```

  Plus a new `EnemyItemProfile` aggregator that the recommender consumes:
  ```ts
  export interface EnemyItemProfile {
    /** Items present in any enemy inventory by stat tag */
    presence: Map<ItemTag["statTags"][number], number>;
    /** Items that scale healing across the enemy team (e.g. Goredrinker,
        Death's Dance lifeline, Soraka with Redemption) */
    healingItems: { ownerChampionId: string; itemId: string; itemName: string }[];
    /** Antiheal item presence on ally side — recommender knows whether
        an ally already addressed the healing threat */
    allyHasAntiheal: boolean;
    /** Total enemy gold spent on items, aggregated */
    totalEnemyGoldSpent: number;
    /** Build-stage label */
    stage: "early" | "1-item" | "2-item" | "core" | "full";
  }
  ```

- `src/lib/games/league/recommender.ts` — the 12 rules upgrade to gate
  on the item profile, not just champion tags. Examples:

  | Rule | Was | Becomes |
  |---|---|---|
  | Antiheal | `healing tag >= 1` | `healingItems.length >= 1` (real items, not just tags) AND `!allyHasAntiheal` |
  | AP-heavy | `AP >= 3` | `AP >= 3 OR presence.get("AP") >= 4` (covers 2-AP teams who still rushed ap items) |
  | AD-heavy | `AD >= 3` | `AD >= 3 OR presence.get("AD") >= 4` |
  | Tank-heavy | `tank >= 2` | `tank >= 2 AND presence.get("HP") + presence.get("Armor") >= 4` (real tanky items, not just frontline champs without items) |
  | Burst | `burst >= 2` | severity bumps when `mythicBuilt` AND fed |
  | Engage | `engage >= 2` | severity bumps when enemy support has Locket / Knight's Vow / Zeke's |

  Rationale strings cite which items triggered the rule:
  `"Aatrox built Goredrinker, Soraka built Redemption — antiheal is critical."`

- `src/lib/games/league/data-dragon.ts` — extend with item fetch (currently
  only champion data is fetched). Add caching: items are large (~500
  entries) so we cache the indexed Map in module scope per patch.

### Verification

- Unit-style smoke: feed a synthetic Match where enemy Ahri has Liandry
  + Void Staff vs one where enemy Ahri has Doran's Ring only — assert
  the threat score for the first is significantly higher.
- E2E: existing companion + spectator paths return the same
  `Recommendation[]` shape, with new `source: { layer: 1, ruleId }`
  field populated.
- `pnpm exec tsc --noEmit` clean.
- `pnpm lint` clean.

---

## Layer 2 — Curated counter-knowledge graph + per-champion paths (multi-session)

**Goal:** the recommender knows that Maw counters Liandry, that Mortal
Reminder counters healers, that Yasuo's first three items are usually
PD → IE → Bloodthirster. It picks an *ordered* next item.

### Architecture

Three new data files (read-only, hand-curated, version-pinned):

```
src/lib/games/league/data/
  items-curated.ts        ← per-item semantic tags + counter relationships
  champions-curated.ts    ← per-champion typical build paths + power spikes
  counter-graph.ts        ← threat-type → counter-list mappings
```

Plus a new recommender module `src/lib/games/league/recommender-l2.ts`
that consumes layer-1 output + the three curated files and produces
`AllyAction[]` with `buildPath: BuildStep[]`.

### Data shapes

**`items-curated.ts`:**

```ts
export interface CuratedItem {
  id: string;                    // matches Riot item ID
  name: string;
  /** Semantic counter classes — what this item is *for* */
  counters: ("AP-burst" | "AP-DoT" | "AP-sustained" | "AD-burst" | "AD-sustained"
    | "AD-attackspeed" | "Tank" | "Healing" | "Shielding" | "CC-chain"
    | "Engage" | "Poke" | "Roam")[];
  /** Power-spike weight: how much this item changes the holder's threat */
  spikeWeight: 1 | 2 | 3;        // 1 = component, 2 = legendary, 3 = mythic / defining
  /** Typical position-archetypes that buy this */
  forArchetypes: ("carry" | "frontline" | "support" | "jungler" | "any")[];
  /** Citation: Riot description text or wiki page section */
  cite: string;
}
```

About 100-150 entries covering the items most likely to appear in a
ranked game. Curation source: Riot's published item descriptions (free,
patch-current via Data Dragon), official Riot patch notes, and the
public LoL Wiki for mechanic explanations.

**`champions-curated.ts`:**

```ts
export interface CuratedChampion {
  id: string;                          // matches Riot champion ID
  name: string;
  positions: ("TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY")[];
  /** Typical core build, in priority order */
  coreBuild: { position: string; items: string[] }[];
  /** Power spikes — moments threat materially jumps */
  powerSpikes: {
    items: string[];                   // e.g. ["3142", "1038"] = Eclipse + BF Sword
    label: string;                     // "Eclipse + BF Sword (2-item spike)"
    threatLevel: "low" | "medium" | "high" | "critical";
  }[];
  /** Items that specifically counter this champion when built by enemies */
  counteredBy: { itemId: string; reason: string; cite: string }[];
  cite: string;
}
```

About 50-80 entries covering the most-played champions per role. Layer 2
falls back gracefully when a champion has no curated entry — it just
doesn't emit per-champion advice for that ally.

**`counter-graph.ts`:**

```ts
export const COUNTER_GRAPH: Record<ThreatType, ThreatCounterEntry> = {
  "AP-burst": {
    description: "Single-target magic burst (LeBlanc, Syndra, Veigar)",
    items: [
      { itemId: "3140", priority: 1, reason: "QSS clears the lockdown that enables burst" },
      { itemId: "3157", priority: 2, reason: "Zhonya's stasis interrupts burst combos" },
      { itemId: "3156", priority: 3, reason: "Maw lifeline + magic-damage shield" },
    ],
  },
  "AP-DoT": {
    description: "Sustained magic damage over time (Brand, Cassiopeia, Ahri w/ Liandry)",
    items: [
      { itemId: "4401", priority: 1, reason: "Force of Nature scales with sustained magic" },
      { itemId: "3156", priority: 2, reason: "Maw shield triggers under DoT pressure" },
    ],
  },
  // ... ~15-20 entries
};
```

Citations: every counter entry cites the documented mechanic. No "I think
this counters X" — every claim links to Riot's published description.

### Algorithm flow (layer 2)

```
For each ally in match.teams[0].participants:
  1. Look up CuratedChampion(ally.championId) — skip if absent
  2. Identify dominant enemy threat types:
     - Enumerate enemies, for each enemy look up CuratedChampion
     - Combine champion's intrinsic threat type with their CURRENT items
       (e.g. Ahri intrinsically "AP-burst", but with Liandry → "AP-DoT")
     - Tally threat types weighted by enemy gold + completed-item count
  3. For top 1-2 dominant threat types, fetch counter list from COUNTER_GRAPH
  4. Filter counter items by ally archetype eligibility
  5. Rank by:
     - Whether ally already owns components (cheaper to complete)
     - Power-spike timing (item that spikes earlier > later)
     - Gold-efficiency vs ally's current gold
  6. Emit BuildStep[] with top 1-3 items, each with a cited reason
  7. Set source: { layer: 2, ruleId, cite } on each step
```

The algorithm degrades gracefully: champions without curated entries
just don't get per-champion advice (layer 1 still produces the team-wide
rule recommendations).

### Curation strategy (the labor question)

The core question you raised: who writes the curated files?

**Option A — I draft, you review.** I draft items-curated.ts,
champions-curated.ts, counter-graph.ts from publicly documented sources
(Riot's item descriptions, patch notes, LoL Wiki mechanic pages). Each
entry cites its source. You review in batches of ~20 items / ~10
champions and correct anything that's wrong. Time: ~2-3 sessions of my
work + ~1 session of your review per batch.

**Option B — You draft, I help structure.** You write the curated
knowledge (you know LoL, you know what counters what). I provide the
TypeScript scaffolding and the schema, you fill in the data. Cleaner
provenance — every entry traces to your judgment. Time: bottlenecked
on your time.

**Option C — Hybrid.** I draft the structural skeleton (item DB
classification from Data Dragon, base counter-graph stubs), you fill
in the spike-defining champion-specific knowledge (which champions are
power-spike-defined, which counters are mechanics-vs-mechanics rather
than tag-vs-tag). Best of both — Riot-derived data is mine,
LoL-expertise data is yours. Time: ~1 session each, parallelizable.

**Recommendation:** Option C. The tag classification is mechanical and
verifiable from Data Dragon. The semantic counter-graph and per-champion
paths benefit from your domain knowledge.

### Files (layer 2)

**New:**
- `src/lib/games/league/data/items-curated.ts`
- `src/lib/games/league/data/champions-curated.ts`
- `src/lib/games/league/data/counter-graph.ts`
- `src/lib/games/league/recommender-l2.ts`
- `src/lib/games/league/__fixtures__/test-matches.ts` — synthetic
  matches for verification (optional but valuable)

**Modified:**
- `src/lib/games/league/recommender.ts` — calls into recommender-l2
  after layer-1 rules, merges results
- `src/lib/games/league/ally-actions.ts` — `getAllyActions()` returns
  AllyAction with `buildPath` populated when layer 2 has curated data

### Verification

- Synthetic Match scenarios:
  - Yasuo (top, ally) vs AP-burst comp → buildPath includes Mercury's,
    Maw, GA in some order
  - Yasuo vs AD-tank comp → buildPath includes Plated Steelcaps,
    Mortal Reminder
  - Aatrox (enemy, ally fighting him with Yasuo) before Goredrinker →
    no antiheal urgency; Aatrox after Goredrinker → antiheal flagged
- Unit assertions on the merge: when both layer-1 antiheal rule fires
  AND layer-2 has Mortal Reminder in counter-graph, output should cite
  both via `alsoFrom`.
- All curated data files import-checked at build time (no missing
  citations, no orphan item IDs).

---

## Layer 3 — Empirical aggregates from Match-V5 (scaffolded; dormant)

**Goal:** when layer 2's curated answer is "Mortal Reminder counters
healers," layer 3 says "in 2400 ranked games this patch where you played
Yasuo vs Aatrox + Soraka, the build that won most was Eclipse → Death's
Dance → Sterak's → Mortal Reminder." Empirically grounded, patch-current.

### Why scoped, not universal

A naive layer-3 would try to ingest every match in every region, derive
every champion's winning build at every elo. That's op.gg's 10-year
infrastructure. We don't need it — we need a focused slice:

- **High elo only** (Master+, top ~0.3% of players). Their builds
  approximate optimal play.
- **Current patch only.** Anything older is meta-stale.
- **Top ~100 champions × 5 positions = ~500 (champion, position) cells.**
- **30+ games per cell minimum** before any aggregate is queryable.
- **Daily refresh.** Patch rolls every 2 weeks; we want fresh data
  within 24h of patch rollover.

That fits a single Personal Application Key's rate limit if we're smart
about which matches to fetch.

### Architecture

```
                  ┌─────────────────────────┐
                  │  Vercel cron (daily)    │
                  │  /api/cron/ingest-l3    │
                  └─────────────┬───────────┘
                                │
                                ▼
              ┌──────────────────────────────────────┐
              │  Ingest pipeline                     │
              │                                      │
              │  1. League-V4 → fetch top Master+    │
              │     summoners (per region)           │
              │  2. Match-V5 → fetch their last      │
              │     N ranked games this patch        │
              │  3. Filter to current patch only     │
              │  4. Insert into match_player_builds  │
              │  5. Refresh champion_build_aggregates│
              │     (materialized derivation)        │
              └─────────────┬────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────────────────┐
              │  Storage (Postgres or similar)       │
              │                                      │
              │  match_player_builds (row per        │
              │    player per match)                 │
              │  champion_build_aggregates           │
              │    (champion, position, patch) →     │
              │    top builds with win rate          │
              └─────────────┬────────────────────────┘
                            │
                            ▼
              ┌──────────────────────────────────────┐
              │  recommender-l3.ts                   │
              │                                      │
              │  getEmpiricalBuild(championId,       │
              │    position, patch, enemyComp) →     │
              │    BuildStep[] | null                │
              └──────────────────────────────────────┘
```

### Data model (Drizzle schema)

**New:** `src/lib/db/schema-recommender.ts`

```ts
import { pgTable, varchar, integer, timestamp, real, jsonb, index } from "drizzle-orm/pg-core";

export const matchPlayerBuilds = pgTable("match_player_builds", {
  matchId: varchar("match_id", { length: 32 }).notNull(),
  championId: varchar("champion_id", { length: 32 }).notNull(),
  position: varchar("position", { length: 16 }).notNull(),
  patch: varchar("patch", { length: 16 }).notNull(),
  region: varchar("region", { length: 8 }).notNull(),
  win: integer("win").notNull(),                // 0|1
  /** Final inventory item IDs in build order */
  finalBuild: jsonb("final_build").$type<string[]>().notNull(),
  /** Item completion order with timestamps from match timeline */
  buildOrder: jsonb("build_order").$type<{ itemId: string; minute: number }[]>().notNull(),
  enemyComp: jsonb("enemy_comp").$type<string[]>().notNull(),
  capturedAt: timestamp("captured_at").defaultNow().notNull(),
}, (t) => ({
  pkChampPos: index("match_player_builds_champ_pos_patch").on(t.championId, t.position, t.patch),
}));

export const championBuildAggregates = pgTable("champion_build_aggregates", {
  championId: varchar("champion_id", { length: 32 }).notNull(),
  position: varchar("position", { length: 16 }).notNull(),
  patch: varchar("patch", { length: 16 }).notNull(),
  /** Build signature (sorted item IDs joined) */
  buildSignature: varchar("build_signature", { length: 128 }).notNull(),
  buildItems: jsonb("build_items").$type<string[]>().notNull(),
  sampleSize: integer("sample_size").notNull(),
  winRate: real("win_rate").notNull(),
  /** Average completion time per item in this build */
  pacing: jsonb("pacing").$type<{ itemId: string; avgMinute: number }[]>().notNull(),
  refreshedAt: timestamp("refreshed_at").defaultNow().notNull(),
});

// Future: add enemy-comp-conditioned aggregates once base table fills up
```

### Files (layer 3)

**New (scaffolded; dormant in dev):**
- `src/lib/db/schema-recommender.ts` — Drizzle schema (above)
- `drizzle/migrations/<next>_recommender_tables.sql` — generated migration
- `src/lib/games/league/recommender-l3.ts` — query interface:
  ```ts
  export async function getEmpiricalBuild(args: {
    championId: string;
    position: string;
    patch: string;
    enemyChampionIds: string[];
  }): Promise<BuildStep[] | null>;
  ```
  Implementation reads `championBuildAggregates`, filters by sample
  size (≥30) and win rate (≥50%), returns top build. **Dormant by
  default**: returns `null` when `RECOMMENDER_LAYER_3=false`.

- `src/app/api/cron/ingest-l3/route.ts` — cron endpoint that runs the
  ingest pipeline. **Dormant by default**: no-op when
  `RECOMMENDER_LAYER_3_INGEST=false`. Even when on, exits early if
  `RIOT_API_KEY` is not a Personal Application Key (rate-limit guard).

- `src/lib/games/league/ingest/league-v4.ts` — fetches Master+
  summoner IDs per region
- `src/lib/games/league/ingest/match-v5.ts` — fetches Match-V5 detail
  with timeline
- `src/lib/games/league/ingest/aggregator.ts` — derives
  championBuildAggregates from raw match_player_builds rows
- `src/lib/games/league/ingest/patch-tracking.ts` — detects current
  patch, marks old patches as stale

**Modified:**
- `src/lib/games/league/recommender.ts` — calls `recommender-l3` after
  layer 2, merges with `alsoFrom` provenance
- `vercel.json` (or `vercel.ts` per knowledge update) — adds cron entry
  for `/api/cron/ingest-l3`, schedule `0 6 * * *` (daily at 6am UTC).
  **The cron entry is added but the route guards itself with the
  feature flag.**
- `.env.example` — adds `RECOMMENDER_LAYER_3=false`,
  `RECOMMENDER_LAYER_3_INGEST=false`

### Activation runbook (post-PAK, future session)

When PAK lands and the storage backend pick is made:

1. Run `pnpm db:push` to apply the migration.
2. Set `RECOMMENDER_LAYER_3_INGEST=true` in production env.
3. Manually trigger `/api/cron/ingest-l3` once via curl to seed.
4. After ~7 days of daily ingest, sample size threshold is met for top
   champions.
5. Set `RECOMMENDER_LAYER_3=true` in production env. Recommender starts
   merging empirical results into output.
6. Monitor: how often layer 3 wins the merge, how many cells have
   sample size, ingest job latency / errors.

### Verification (during scaffolding)

- Schema migrates cleanly against a local Postgres (or whatever
  storage backend is picked when PAK lands).
- `recommender-l3.getEmpiricalBuild()` returns `null` when flag is
  false; returns mock fixture data when both flag is true and a
  test fixture is loaded.
- The cron route returns 204 when flag is false; returns 200 with a
  job-status payload when flag is true.
- `pnpm exec tsc --noEmit` clean.

### What we don't decide in this plan (deferred to post-PAK)

- ~~Storage backend pick~~ — **resolved.** `DATABASE_URL` is already
  wired up in `.env.local` (Postgres-compatible, currently Neon-shape
  per `.env.example`; user-managed dbhost.app is interchangeable).
  Drizzle is configured with one existing migration applied. Layer 3
  tables are a pure additive migration on top.
- Daily ingest budget (how many matches per region per day) — depends
  on PAK rate limit allocation.
- Per-(enemy-comp) conditioning — initial layer 3 ignores enemy comp
  beyond filtering. Once base aggregates fill, a follow-up adds
  comp-conditioned cells.

---

## Cross-cutting concerns

### Patch staleness

- Layer 1: stale only when Riot patches change item IDs (rare; existing
  IDs are stable across patches). Item descriptions can change; the
  Data Dragon fetch refreshes on each restart, so we always have
  patch-current data.
- Layer 2: hand-curated counter-graph entries can drift when Riot
  reworks an item or champion. Mitigation: each entry has a
  `patchPinned: "14.24"` field; recommender warns in logs when current
  patch differs from pinned by more than 1. Manual review burden.
- Layer 3: self-correcting. When patch rolls, ingest job picks up new
  patch's matches; old patch's aggregates stay queryable for backward
  comparison but recommender prefers latest patch.

### Testing strategy

A `__fixtures__/` directory holds synthetic Matches for each layer's
verification. No external test framework; smoke tests are runnable
scripts that assert recommendation IDs and source layers. Per
project convention (no test-runner imported), this stays lightweight.

### Observability

Each recommendation in the API response carries its `source` field.
The `/companion` view and the `/live` view can show the source as a
small chip ("from live state" / "curated" / "2400 games"), letting
users (and us, debugging) understand why a recommendation appeared.

### UI implications

The UI consuming the recommendations (`src/components/match-intel-strip.tsx`,
the live view header, the ally action panel) should:
- Render `source.layer` as a small chip per recommendation
- For `BuildStep[]`, render an ordered list with cost + reason
- For empirical recommendations, render sample size + win rate
- Gracefully handle missing source (back-compat with current shape)

UI changes are **not** part of this plan — they happen in a
follow-up session once the data is available.

---

## Order of execution

### Session N (next, with this plan approved)

**Layer 1 only.** Item-aware rules + threat scoring upgrade. Ships as a
single coherent change. Verifiable via synthetic Match smoke + existing
companion + spectator paths.

### Session N+1, N+2 (multi-session, layer 2)

**N+1:** Item DB classification from Data Dragon + items-curated.ts
skeleton + counter-graph.ts skeleton. Verifiable: layer 2 returns
empty BuildStep[] when curation entries don't exist; returns populated
when they do.

**N+2:** Curation pass for top 50 champions and ~100 most-built items.
Recommender-l2 fully integrated. Synthetic-Match verification passes
for representative scenarios.

### Session N+3 (layer 3 scaffolding, dormant)

Schema + Drizzle migration + ingest stubs + query interface stub +
cron route stub + .env flags. **All gated behind feature flags.** No
data flowing. `pnpm build` + `pnpm exec tsc --noEmit` clean.

### Post-PAK, future

Activation runbook above. Out of scope for this plan; tracked in
HANDOFF.md "Pending items" once PAK lands.

---

## Files summary

### New (across all sessions)

```
Layer 1:
  src/lib/games/league/item-tags.ts
  (modifies data-dragon.ts to add item fetch + cache)

Layer 2:
  src/lib/games/league/data/items-curated.ts
  src/lib/games/league/data/champions-curated.ts
  src/lib/games/league/data/counter-graph.ts
  src/lib/games/league/recommender-l2.ts
  src/lib/games/league/__fixtures__/test-matches.ts (optional)

Layer 3 (scaffolded, dormant):
  src/lib/db/schema-recommender.ts
  drizzle/migrations/<next>_recommender_tables.sql
  src/lib/games/league/recommender-l3.ts
  src/lib/games/league/ingest/league-v4.ts
  src/lib/games/league/ingest/match-v5.ts
  src/lib/games/league/ingest/aggregator.ts
  src/lib/games/league/ingest/patch-tracking.ts
  src/app/api/cron/ingest-l3/route.ts
```

### Modified

```
src/lib/games/league/recommender.ts        ← orchestrates 1+2+3 merge
src/lib/games/league/ally-actions.ts       ← threat scoring + EnemyItemProfile
src/lib/games/league/data-dragon.ts        ← add item fetch
src/lib/games/types.ts                     ← extend Recommendation/AllyAction with source
.env.example                               ← layer-3 feature flags
vercel.json (or vercel.ts)                 ← layer-3 cron entry (dormant)
HANDOFF.md                                 ← session summaries as work ships
```

---

## Verification (cross-cutting, ship-ready acceptance)

After layer 1:
- `pnpm exec tsc --noEmit` clean
- `pnpm lint` 0 errors
- `pnpm build` passes
- Smoke: existing live/companion paths return populated `Recommendation[]`,
  with `source.layer === 1` set on each
- Smoke: synthetic enemy-Ahri-Liandry vs enemy-Ahri-DoranRing produces
  measurably different threat scores

After layer 2:
- All of the above
- Smoke: top-50 champions have curated entries; layer-2 ally actions
  populate `buildPath` for those champs
- Smoke: counter-graph dispatches correctly for AP-burst, AP-DoT,
  AD-burst, Tank, Healing dominant comps

After layer 3 scaffolding:
- All of the above
- Schema migrates cleanly to local Postgres (or chosen backend)
- `getEmpiricalBuild()` returns null with flag off
- Cron route returns 204 with flag off
- Build size + cold-start unchanged (ingest code only loaded when flag is on)

After PAK + activation (out of scope here):
- Layer 3 ingest runs daily, populates aggregates
- Recommender starts merging empirical results when sample size ≥ 30
- UI shows "n=2400, win-rate 54%" provenance for empirical
  recommendations
