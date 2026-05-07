import { NextResponse } from "next/server";

import { cachedMatch } from "@/lib/cache";
import { ensureItemDb } from "@/lib/games/league/item-tags";
import { mergeLayer3 } from "@/lib/games/league/recommender-l3";
import { buildMockPayload } from "@/lib/games/mock";
import { getAdapter, isGameId } from "@/lib/games/registry";
import type {
  AllyAction,
  Match,
  MatchIntel,
  MatchPlan,
  MatchSummary,
  Player,
  Recommendation,
} from "@/lib/games/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Payload {
  match: Match | null;
  recommendations: Recommendation[];
  allyActions: AllyAction[];
  plan: MatchPlan | null;
  intel: MatchIntel | null;
  recentMatches: MatchSummary[];
  fetchedAt: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game") ?? "";
  const id = searchParams.get("id") ?? "";
  const region = searchParams.get("region") ?? undefined;
  const displayName = searchParams.get("name") ?? "";
  const mock = searchParams.get("mock") === "1";

  // Mock mode: bypass cache, adapter, and external APIs entirely.
  // Useful for testing the UI when no live match is available.
  if (mock) {
    return NextResponse.json(buildMockPayload());
  }

  if (!isGameId(game)) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  }
  if (!id) {
    return NextResponse.json({ error: "Missing id" }, { status: 400 });
  }

  const adapter = getAdapter(game);
  const player: Player = {
    gameId: game,
    externalId: id,
    displayName: displayName || id,
    region,
  };

  try {
    const cached = await cachedMatch<Payload>({
      gameId: game,
      externalId: id,
      ttlSeconds: 30,
      nullTtlSeconds: 12,
      fetcher: async () => {
        // Try live match first
        let match = await adapter.getActiveMatch(player);

        // Fallback: most recent finished match (post-game). Riot's Spectator-v5
        // returns null for many cases (3-min delay, custom games, streamer
        // policy filter) — Match-v5 has full historical data we can analyze.
        if (!match && adapter.getLastFinishedMatch) {
          try {
            match = await adapter.getLastFinishedMatch(player);
          } catch {
            // ignore — fallback is best-effort
          }
        }

        // Recent matches strip — fire in parallel, never blocks the main view
        const recentMatchesPromise = adapter.getRecentMatches?.(player, 5).catch(() => []) ?? Promise.resolve([]);

        // Layer-1: warm the item DB so league recs can read enemy items.
        // No-op for Dota; best-effort if Data Dragon is unreachable.
        if (match && game === "league") {
          try {
            await ensureItemDb();
          } catch {
            /* degrades to tag-only behaviour */
          }
        }

        const recommendations = match ? adapter.recommender.recommend(match) : [];
        const allyActionsBase = match ? (adapter.recommender.allyActions?.(match) ?? []) : [];
        // Layer-3 merge: no-op when RECOMMENDER_LAYER_3=false (default).
        const allyActions = match
          ? await mergeLayer3(match, allyActionsBase)
          : allyActionsBase;
        const plan = match ? (adapter.recommender.plan?.(match) ?? null) : null;
        const intel = match ? (adapter.recommender.intel?.(match) ?? null) : null;
        const recentMatches = await recentMatchesPromise;
        return { match, recommendations, allyActions, plan, intel, recentMatches, fetchedAt: Date.now() };
      },
    });

    return NextResponse.json(
      cached ?? {
        match: null,
        recommendations: [],
        allyActions: [],
        plan: null,
        intel: null,
        recentMatches: [],
        fetchedAt: Date.now(),
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Live fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
