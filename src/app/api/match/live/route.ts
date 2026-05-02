import { NextResponse } from "next/server";

import { cachedMatch } from "@/lib/cache";
import { buildMockPayload } from "@/lib/games/mock";
import { getAdapter, isGameId } from "@/lib/games/registry";
import type {
  AllyAction,
  Match,
  MatchIntel,
  MatchPlan,
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
        const match = await adapter.getActiveMatch(player);
        const recommendations = match ? adapter.recommender.recommend(match) : [];
        const allyActions = match ? (adapter.recommender.allyActions?.(match) ?? []) : [];
        const plan = match ? (adapter.recommender.plan?.(match) ?? null) : null;
        const intel = match ? (adapter.recommender.intel?.(match) ?? null) : null;
        return { match, recommendations, allyActions, plan, intel, fetchedAt: Date.now() };
      },
    });

    return NextResponse.json(
      cached ?? {
        match: null,
        recommendations: [],
        allyActions: [],
        plan: null,
        intel: null,
        fetchedAt: Date.now(),
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "Live fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
