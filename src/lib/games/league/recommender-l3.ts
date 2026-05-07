/**
 * Layer-3 recommender — empirical aggregates from Match-V5 ingest.
 *
 * STATUS: SCAFFOLDED, DORMANT.
 *
 * Activates when:
 *   - `RECOMMENDER_LAYER_3=true` in env, AND
 *   - `champion_build_aggregates` table has rows for the requested
 *     (championId, position, patch) tuple with sample_size >= 30.
 *
 * Until both are true, `getEmpiricalBuild()` returns `null` and the
 * recommender's merge stage falls back to layer-2 (curated) or layer-1
 * (rule) for each ally.
 *
 * See docs/plans/recommender-tiered-engine.md → "Layer 3" for the
 * activation runbook (post-PAK).
 */

import { and, desc, eq, gte, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db/client";
import type { BuildStep, Match } from "@/lib/games/types";

import { getItemTag } from "./item-tags";

interface EmpiricalBuildArgs {
  championId: string;
  position: string;
  patch: string;
  /** Enemy team's champion IDs — reserved for comp-conditioned aggregates
   *  in a follow-up. Currently unused (top-builds across all comps). */
  enemyChampionIds?: string[];
  /** Minimum sample size to consider a build valid. Default 30 — below
   *  this, the win-rate signal is too noisy. */
  minSampleSize?: number;
  /** Minimum win rate to surface. Default 0.5 — below this, layer-2
   *  curation is probably the better recommendation anyway. */
  minWinRate?: number;
}

const isEnabled = () => process.env.RECOMMENDER_LAYER_3 === "true";

/**
 * Returns the empirically-best build for the (champion, position, patch)
 * tuple, or null when:
 *   - The feature flag is off
 *   - No aggregates exist yet for the tuple
 *   - The best aggregate's sample size is below threshold
 *
 * Output BuildSteps carry `confidence: "empirical"` and a citation that
 * includes the win rate + sample size + patch — exactly what the UI
 * surfaces ("backed by 2400 ranked games, 54% win rate, patch 14.24").
 */
export async function getEmpiricalBuild(args: EmpiricalBuildArgs): Promise<BuildStep[] | null> {
  if (!isEnabled()) return null;

  const minSampleSize = args.minSampleSize ?? 30;
  const minWinRate = args.minWinRate ?? 0.5;

  let rows;
  try {
    rows = await db()
      .select()
      .from(schema.championBuildAggregates)
      .where(
        and(
          eq(schema.championBuildAggregates.championId, args.championId),
          eq(schema.championBuildAggregates.position, args.position),
          eq(schema.championBuildAggregates.patch, args.patch),
          gte(schema.championBuildAggregates.sampleSize, minSampleSize),
          gte(schema.championBuildAggregates.winRate, minWinRate),
        ),
      )
      .orderBy(desc(schema.championBuildAggregates.winRate))
      .limit(1);
  } catch (err) {
    // Schema not migrated yet (e.g., dev without `pnpm db:push`) — treat
    // as "no data" rather than failing the request.
    if (process.env.NODE_ENV !== "production") {
      console.warn("[recommender-l3] aggregates query failed (likely schema not migrated):", err);
    }
    return null;
  }

  if (rows.length === 0) return null;

  const top = rows[0];
  const cite = `Empirical: ${top.sampleSize} ranked games, ${(top.winRate * 100).toFixed(1)}% win rate, patch ${top.patch}`;

  const steps: BuildStep[] = [];
  for (const itemId of top.buildItems) {
    const tag = getItemTag(itemId);
    if (!tag) continue;
    const pace = top.pacing.find((p) => p.itemId === itemId);
    steps.push({
      itemId,
      itemName: tag.name,
      reason: pace
        ? `Avg completion at ${pace.avgMinute.toFixed(1)} min in winning games`
        : "Part of the highest-win-rate build for this matchup",
      cost: tag.cost,
      confidence: "empirical",
      cite,
    });
  }
  return steps.length > 0 ? steps : null;
}

/**
 * Diagnostic: how many distinct (champion, position, patch) tuples have
 * any aggregate row at all. Used by the cron route's status payload to
 * surface "we have data for X champions on patch Y".
 */
export async function aggregateCoverage(): Promise<{ tuples: number; rows: number } | null> {
  if (!isEnabled()) return null;
  try {
    const rows = await db()
      .select({
        tuples: sql<number>`count(distinct (${schema.championBuildAggregates.championId},
                                              ${schema.championBuildAggregates.position},
                                              ${schema.championBuildAggregates.patch}))`,
        total: sql<number>`count(*)`,
      })
      .from(schema.championBuildAggregates);
    return { tuples: Number(rows[0]?.tuples ?? 0), rows: Number(rows[0]?.total ?? 0) };
  } catch {
    return null;
  }
}

/**
 * Convenience: pulls the active patch from the most recently ingested
 * aggregate. When ingest hasn't run yet, returns null.
 */
export async function activePatchFromAggregates(): Promise<string | null> {
  if (!isEnabled()) return null;
  try {
    const rows = await db()
      .select({ patch: schema.championBuildAggregates.patch })
      .from(schema.championBuildAggregates)
      .orderBy(desc(schema.championBuildAggregates.refreshedAt))
      .limit(1);
    return rows[0]?.patch ?? null;
  } catch {
    return null;
  }
}

/** Convenience overload: pull args from a Match for a specific ally. */
export async function getEmpiricalBuildForAlly(
  match: Match,
  allyChampionId: string,
  patch: string,
): Promise<BuildStep[] | null> {
  const ally = match.teams[0].participants.find((p) => p.character.id === allyChampionId);
  if (!ally?.position) return null;
  const enemyChampionIds = match.teams[1].participants.map((p) => p.character.id);
  return getEmpiricalBuild({
    championId: allyChampionId,
    position: ally.position,
    patch,
    enemyChampionIds,
  });
}

interface MergeableAction {
  championId: string;
  buildPath?: BuildStep[];
  source?: import("@/lib/games/types").RecommendationSource;
}

function parseEmpiricalCite(cite: string): { sampleSize: number; winRate: number } {
  const sampleMatch = cite.match(/(\d+)\s+ranked games/);
  const winMatch = cite.match(/([\d.]+)%/);
  return {
    sampleSize: sampleMatch ? Number(sampleMatch[1]) : 0,
    winRate: winMatch ? Number(winMatch[1]) / 100 : 0,
  };
}

/**
 * Layer-3 merge. Walks AllyAction[] from layer 1+2 and replaces buildPath
 * with empirical results when (a) L3 is enabled, (b) aggregates exist for
 * this ally's (champion, position, patch) tuple, (c) sample size meets
 * the threshold.
 *
 * Returns the actions array unchanged when L3 is off — so API routes can
 * call this unconditionally without branching.
 */
export async function mergeLayer3<T extends MergeableAction>(
  match: Match,
  actions: T[],
): Promise<T[]> {
  if (!isEnabled()) return actions;

  let patch: string;
  try {
    patch = (await activePatchFromAggregates()) ?? "";
  } catch {
    return actions;
  }
  if (!patch) return actions;

  for (const action of actions) {
    const empirical = await getEmpiricalBuildForAlly(match, action.championId, patch);
    if (!empirical || empirical.length === 0) continue;

    const { sampleSize, winRate } = parseEmpiricalCite(empirical[0]?.cite ?? "");
    action.buildPath = empirical;
    action.source = { layer: 3, sampleSize, winRate, patch };
  }
  return actions;
}
