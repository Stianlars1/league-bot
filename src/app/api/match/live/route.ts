import { NextResponse } from "next/server";

import { cachedMatch } from "@/lib/cache";
import { getAdapter, isGameId } from "@/lib/games/registry";
import type { Match, Player, Recommendation } from "@/lib/games/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Payload {
  match: Match | null;
  recommendations: Recommendation[];
  fetchedAt: number;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const game = searchParams.get("game") ?? "";
  const id = searchParams.get("id") ?? "";
  const region = searchParams.get("region") ?? undefined;
  const displayName = searchParams.get("name") ?? "";

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
        return { match, recommendations, fetchedAt: Date.now() };
      },
    });

    return NextResponse.json(cached ?? { match: null, recommendations: [], fetchedAt: Date.now() });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Live fetch failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
