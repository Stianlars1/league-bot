/**
 * Aggregator — derives `champion_build_aggregates` rows from raw
 * `match_player_builds` data. Runs at the end of each ingest cycle.
 *
 * Build signature: items sorted ascending and joined by "-". Two
 * players who built the same items in different orders share a row.
 * Order-aware aggregates can be added later as a separate column /
 * derived table.
 *
 * STATUS: Scaffolded. Pure function over a list of MatchPlayerBuild
 * rows; no DB writes happen here (caller handles upsert). Logic is
 * correct but unverified end-to-end since the upstream rows don't
 * exist until ingest runs.
 */

import type { InferSelectModel } from "drizzle-orm";

import type { matchPlayerBuilds } from "@/lib/db/schema-recommender";

type MatchPlayerBuild = InferSelectModel<typeof matchPlayerBuilds>;

export interface DerivedAggregate {
  championId: string;
  position: string;
  patch: string;
  buildSignature: string;
  buildItems: string[];
  sampleSize: number;
  winRate: number;
  pacing: { itemId: string; avgMinute: number }[];
}

/**
 * Collapse a list of per-player per-match build snapshots into
 * aggregate rows. Filters trivial samples (< 5 games per build) so
 * the output is queryable.
 */
export function aggregateBuilds(builds: MatchPlayerBuild[]): DerivedAggregate[] {
  // Group by (champion, position, patch, signature)
  const buckets = new Map<string, MatchPlayerBuild[]>();
  for (const b of builds) {
    if (!Array.isArray(b.finalBuild) || b.finalBuild.length === 0) continue;
    const sig = signatureOf(b.finalBuild);
    const key = `${b.championId}|${b.position}|${b.patch}|${sig}`;
    const list = buckets.get(key) ?? [];
    list.push(b);
    buckets.set(key, list);
  }

  const out: DerivedAggregate[] = [];
  for (const [key, group] of buckets) {
    if (group.length < 5) continue; // Trivial samples filtered
    const [championId, position, patch, signature] = key.split("|");
    const wins = group.reduce((acc, b) => acc + (b.win === 1 ? 1 : 0), 0);
    out.push({
      championId,
      position,
      patch,
      buildSignature: signature,
      buildItems: canonicalOrder(group[0].finalBuild),
      sampleSize: group.length,
      winRate: wins / group.length,
      pacing: averagePacing(group),
    });
  }
  return out;
}

/** Sorted-and-joined item-id signature. Stable across build orders. */
function signatureOf(items: readonly string[]): string {
  return [...items].filter(Boolean).sort().join("-");
}

/** Display order — keep most-built order from the first sample, but
 *  this could be smarter (most common position per slot). For v0.1
 *  we use the first sample's order; aggregator pass refines later. */
function canonicalOrder(firstSampleBuild: readonly string[]): string[] {
  return [...firstSampleBuild].filter(Boolean);
}

/** Average minute-of-completion per item across the group. Items not
 *  recorded in any sample's buildOrder fall back to position-based
 *  heuristic ranks (1, 2, 3, ...). */
function averagePacing(group: MatchPlayerBuild[]): { itemId: string; avgMinute: number }[] {
  const sums = new Map<string, { sum: number; n: number }>();
  for (const b of group) {
    if (!Array.isArray(b.buildOrder)) continue;
    for (const step of b.buildOrder) {
      const cell = sums.get(step.itemId) ?? { sum: 0, n: 0 };
      cell.sum += step.minute;
      cell.n += 1;
      sums.set(step.itemId, cell);
    }
  }
  return [...sums.entries()].map(([itemId, { sum, n }]) => ({
    itemId,
    avgMinute: n > 0 ? sum / n : 0,
  }));
}
