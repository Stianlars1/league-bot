/**
 * Layer-3 recommender tables. SCAFFOLDED, DORMANT.
 *
 * These tables exist in the schema but are not populated until the
 * `RECOMMENDER_LAYER_3_INGEST` env flag is set true (see
 * `src/app/api/cron/ingest-l3/route.ts`). Activation is gated on:
 *   1. Riot Personal Application Key approval (Match-V5 rate limits make
 *      the dev key impractical for ingest).
 *   2. The cron schedule being added to vercel.json.
 *
 * See docs/plans/recommender-tiered-engine.md "Layer 3" for the full
 * activation runbook.
 */

import { index, integer, jsonb, pgTable, primaryKey, real, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Per-player per-match build snapshot. One row for each ranked match
 * the ingest job pulls. Used to derive `champion_build_aggregates` via
 * the aggregator. Raw history kept so we can re-derive aggregates with
 * different bucketing or filters without re-fetching from Riot.
 */
export const matchPlayerBuilds = pgTable(
  "match_player_builds",
  {
    matchId: text("match_id").notNull(),
    championId: text("champion_id").notNull(),
    position: text("position").notNull(),
    patch: text("patch").notNull(),
    region: text("region").notNull(),
    /** 0 = lost, 1 = won. Win-rate computed downstream. */
    win: integer("win").notNull(),
    /** Final inventory at game end (Riot item IDs as strings). */
    finalBuild: jsonb("final_build").$type<string[]>().notNull(),
    /** Order of completed items with timestamp from match timeline. */
    buildOrder: jsonb("build_order").$type<{ itemId: string; minute: number }[]>().notNull(),
    /** Enemy team's champion IDs (for comp-conditioned aggregates later). */
    enemyComp: jsonb("enemy_comp").$type<string[]>().notNull(),
    /** Game length in seconds — short games are noisier signal. */
    gameLengthSeconds: integer("game_length_seconds").notNull(),
    capturedAt: timestamp("captured_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.matchId, t.championId, t.position] }),
    index("idx_mpb_champ_pos_patch").on(t.championId, t.position, t.patch),
    index("idx_mpb_patch_region").on(t.patch, t.region),
  ],
);

/**
 * Materialized aggregate: per (champion, position, patch, build), the
 * sample size and win rate. Refreshed by the aggregator after each
 * ingest cycle. Recommender-l3 reads from this; never from the raw
 * `match_player_builds` table directly.
 *
 * `build_signature` is a stable identifier of a build composition —
 * specifically the sorted item IDs joined by "-". Two players who built
 * the same items in different orders share a signature.
 */
export const championBuildAggregates = pgTable(
  "champion_build_aggregates",
  {
    championId: text("champion_id").notNull(),
    position: text("position").notNull(),
    patch: text("patch").notNull(),
    buildSignature: text("build_signature").notNull(),
    /** Items in canonical order for display. */
    buildItems: jsonb("build_items").$type<string[]>().notNull(),
    sampleSize: integer("sample_size").notNull(),
    winRate: real("win_rate").notNull(),
    /** Average completion minute per item slot (for "pacing" UX). */
    pacing: jsonb("pacing").$type<{ itemId: string; avgMinute: number }[]>().notNull(),
    refreshedAt: timestamp("refreshed_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [
    primaryKey({ columns: [t.championId, t.position, t.patch, t.buildSignature] }),
    index("idx_cba_champ_pos_patch_winrate").on(t.championId, t.position, t.patch, t.winRate),
  ],
);

/**
 * Tracks the most recent successful ingest per (region, patch) so the
 * cron job can resume / dedupe. Tiny table, single-row-per-region usage.
 */
export const ingestState = pgTable(
  "ingest_state",
  {
    region: text("region").notNull(),
    patch: text("patch").notNull(),
    /** Last cursor position the ingest reached (e.g., last summoner ID). */
    cursor: text("cursor"),
    matchesIngested: integer("matches_ingested").notNull().default(0),
    lastRunAt: timestamp("last_run_at", { withTimezone: true }).defaultNow().notNull(),
    /** Last error message if any — surfaces to monitoring without a logging stack. */
    lastError: text("last_error"),
  },
  (t) => [primaryKey({ columns: [t.region, t.patch] })],
);
