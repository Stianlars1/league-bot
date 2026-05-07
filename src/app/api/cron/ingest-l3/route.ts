import { eq, sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/lib/db/client";
import { aggregateBuilds } from "@/lib/games/league/ingest/aggregator";
import {
  fetchHighEloSummoners,
  type LeagueEntry,
  RIOT_PLATFORM_HOSTS,
  summonerIdToPuuid,
} from "@/lib/games/league/ingest/league-v4";
import {
  fetchMatchSnapshot,
  fetchRankedMatchIds,
  type RegionalCluster,
} from "@/lib/games/league/ingest/match-v5";
import { currentPatch } from "@/lib/games/league/ingest/patch-tracking";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Layer-3 ingest cron — pulls Master+ ranked games from Riot Match-V5
 * and writes raw snapshots to `match_player_builds`. The aggregator runs
 * after the ingest completes and refreshes `champion_build_aggregates`.
 *
 * STATUS: DORMANT.
 *
 * The route is gated by:
 *   1. CRON_SECRET — same as /api/cron/refresh-catalog (prevents abuse).
 *   2. RECOMMENDER_LAYER_3_INGEST=true — feature flag. Off by default;
 *      flipping it requires a Personal Application Key (Match-V5 rate
 *      limits make ingest impractical with a 24h dev key).
 *
 * When the flag is off, the route returns 204 with a status payload so
 * monitoring can see the cron is wired but intentionally idle.
 *
 * See docs/plans/recommender-tiered-engine.md → "Layer 3 — Activation
 * runbook" for the post-PAK steps to flip this on.
 */
export async function GET(req: Request) {
  // Auth: Vercel cron sends `Bearer <CRON_SECRET>`. Keep the same shape
  // as the existing /api/cron/refresh-catalog route.
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const ingestEnabled = process.env.RECOMMENDER_LAYER_3_INGEST === "true";
  if (!ingestEnabled) {
    return NextResponse.json(
      {
        status: "dormant",
        reason:
          "RECOMMENDER_LAYER_3_INGEST flag is off. See docs/plans/recommender-tiered-engine.md for activation steps.",
      },
      { status: 200 },
    );
  }

  const apiKey = process.env.RIOT_API_KEY;
  if (!apiKey) {
    return NextResponse.json(
      { status: "error", reason: "RIOT_API_KEY not set" },
      { status: 500 },
    );
  }

  // PAK guard: a Personal Application Key is non-expiring and starts
  // with "RGAPI-". A dev key has the same prefix but expires every 24h.
  // We can't tell them apart from the prefix alone, so rely on the
  // operator's flag to assert PAK is in use. Keep this comment as a
  // reminder during activation review.
  //
  // The real guard against accidental dev-key activation is the env
  // flag itself — flipping RECOMMENDER_LAYER_3_INGEST=true is the
  // operator's commitment that they're using a PAK.

  const startedAt = Date.now();
  const patch = await currentPatch();

  // The actual ingest loop. Pull Master+ summoners → puuids → match IDs
  // → match snapshots → write raw rows. Aggregator runs after.
  //
  // STUB: until the ingest module bodies are implemented (post-PAK),
  // this loop is shaped correctly but every call returns empty. Result
  // is "ingested 0 matches", surfaced as a no-op response.
  const regionsToIngest: (keyof typeof RIOT_PLATFORM_HOSTS)[] = ["EUW1", "KR", "NA1"];
  const results: { region: string; summoners: number; matches: number; errors: string[] }[] = [];

  for (const region of regionsToIngest) {
    const errors: string[] = [];
    let summoners: LeagueEntry[] = [];
    let matchCount = 0;
    try {
      summoners = await fetchHighEloSummoners({ region, apiKey, limit: 100 });
    } catch (err) {
      errors.push(`league-v4: ${err instanceof Error ? err.message : String(err)}`);
    }

    const cluster: RegionalCluster =
      region === "EUW1" || region === "TR1" || region === "RU"
        ? "europe"
        : region === "NA1" || region === "BR1" || region === "LA1" || region === "LA2"
          ? "americas"
          : "asia";

    for (const entry of summoners) {
      try {
        const puuid =
          entry.puuid ??
          (await summonerIdToPuuid({ region, summonerId: entry.summonerId, apiKey }));
        if (!puuid) continue;
        const matchIds = await fetchRankedMatchIds({ cluster, puuid, apiKey, limit: 5 });
        for (const matchId of matchIds) {
          const snap = await fetchMatchSnapshot({ cluster, matchId, apiKey, currentPatchId: patch });
          if (!snap) continue;

          const rows = snap.snapshot.participants
            .filter((p) => p.teamPosition && p.finalBuild.length > 0)
            .map((p) => ({
              matchId: snap.snapshot.matchId,
              championId: String(p.championId),
              position: p.teamPosition,
              patch: snap.snapshot.patch,
              region,
              win: p.win ? 1 : 0,
              finalBuild: p.finalBuild,
              buildOrder:
                snap.pacing.find((x) => x.puuid === p.puuid)?.itemBuilds ?? [],
              enemyComp: snap.snapshot.participants
                .filter((other) => other.teamId !== p.teamId)
                .map((other) => String(other.championId)),
              gameLengthSeconds: snap.snapshot.gameLengthSeconds,
            }));

          if (rows.length === 0) continue;
          await db()
            .insert(schema.matchPlayerBuilds)
            .values(rows)
            .onConflictDoNothing();
          matchCount++;
        }
      } catch (err) {
        errors.push(`match-v5: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    results.push({ region, summoners: summoners.length, matches: matchCount, errors });
  }

  // Aggregator pass: derive top builds per (champion, position, patch) from
  // the raw rows and upsert into `champion_build_aggregates`. This refreshes
  // the table the recommender's L3 query path reads from.
  let aggregatesRefreshed = 0;
  try {
    const allRows = await db()
      .select()
      .from(schema.matchPlayerBuilds)
      .where(eq(schema.matchPlayerBuilds.patch, patch));
    const aggregates = aggregateBuilds(allRows);

    const BATCH = 50;
    for (let i = 0; i < aggregates.length; i += BATCH) {
      const slice = aggregates.slice(i, i + BATCH).map((a) => ({
        championId: a.championId,
        position: a.position,
        patch: a.patch,
        buildSignature: a.buildSignature,
        buildItems: a.buildItems,
        sampleSize: a.sampleSize,
        winRate: a.winRate,
        pacing: a.pacing,
        refreshedAt: new Date(),
      }));
      await db()
        .insert(schema.championBuildAggregates)
        .values(slice)
        .onConflictDoUpdate({
          target: [
            schema.championBuildAggregates.championId,
            schema.championBuildAggregates.position,
            schema.championBuildAggregates.patch,
            schema.championBuildAggregates.buildSignature,
          ],
          set: {
            buildItems: sql`excluded.build_items`,
            sampleSize: sql`excluded.sample_size`,
            winRate: sql`excluded.win_rate`,
            pacing: sql`excluded.pacing`,
            refreshedAt: sql`excluded.refreshed_at`,
          },
        });
      aggregatesRefreshed += slice.length;
    }
  } catch (err) {
    // Aggregator failure shouldn't lose the raw ingest. Surface in payload.
    return NextResponse.json({
      status: "partial",
      patch,
      durationMs: Date.now() - startedAt,
      aggregatesRefreshed,
      aggregatorError: err instanceof Error ? err.message : String(err),
      results,
    });
  }

  // Resume cursors / per-region run state. Tiny table, single row per
  // (region, patch); upserts so subsequent runs overwrite.
  for (const r of results) {
    try {
      await db()
        .insert(schema.ingestState)
        .values({
          region: r.region,
          patch,
          matchesIngested: r.matches,
          lastError: r.errors.join("; ") || null,
          lastRunAt: new Date(),
        })
        .onConflictDoUpdate({
          target: [schema.ingestState.region, schema.ingestState.patch],
          set: {
            matchesIngested: sql`excluded.matches_ingested`,
            lastError: sql`excluded.last_error`,
            lastRunAt: sql`excluded.last_run_at`,
          },
        });
    } catch {
      // ingest_state is observability — failing to update it shouldn't
      // poison the response.
    }
  }

  return NextResponse.json({
    status: "ok",
    patch,
    durationMs: Date.now() - startedAt,
    aggregatesRefreshed,
    results,
  });
}
