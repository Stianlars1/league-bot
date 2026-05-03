import { NextResponse } from "next/server";

import { getLatestFrame } from "@/lib/companion/store";
import { getAdapter } from "@/lib/games/registry";
import { liveClientToMatch } from "@/lib/games/league/live-client-converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET /api/match/from-companion?token=<companionToken>&name=<focusedHint>
 *
 * Reads the latest frame the Companion has ingested for this token, converts
 * it into the normalized Match shape, and returns the same `LivePayload` the
 * /api/match/live route returns — so the existing recommender / intel /
 * ally-actions UI all light up unchanged.
 *
 * Returns `match: null` when the token has no frame yet (companion paired but
 * no game active) so the live view can keep its "searching" state.
 */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const token = url.searchParams.get("token");
  const focusedName = url.searchParams.get("name") ?? undefined;

  if (!token || !/^[A-Fa-f0-9]{64}$/.test(token)) {
    return NextResponse.json({ error: "Missing or malformed token" }, { status: 400 });
  }

  const frame = getLatestFrame(token);
  if (!frame) {
    return NextResponse.json({
      match: null,
      recommendations: [],
      allyActions: [],
      plan: null,
      intel: null,
      recentMatches: [],
      fetchedAt: Date.now(),
      companion: { paired: true, hasFrame: false },
    });
  }

  if (frame.gameId !== "league" || frame.source !== "live-client") {
    // Phase 1 will add Dota GSI conversion. For now everything else falls
    // through with no match — the page keeps its "searching" copy.
    return NextResponse.json({
      match: null,
      recommendations: [],
      allyActions: [],
      plan: null,
      intel: null,
      recentMatches: [],
      fetchedAt: Date.now(),
      companion: { paired: true, hasFrame: true, source: frame.source, gameId: frame.gameId },
    });
  }

  const match = await liveClientToMatch(frame.payload, { focusedPlayerName: focusedName });
  if (!match) {
    return NextResponse.json({
      match: null,
      recommendations: [],
      allyActions: [],
      plan: null,
      intel: null,
      recentMatches: [],
      fetchedAt: frame.capturedAt,
      companion: { paired: true, hasFrame: true, source: frame.source, gameId: frame.gameId },
    });
  }

  const adapter = getAdapter("league");
  const recommendations = adapter.recommender.recommend(match);
  const allyActions = adapter.recommender.allyActions?.(match) ?? [];
  const plan = adapter.recommender.plan?.(match) ?? null;
  const intel = adapter.recommender.intel?.(match) ?? null;

  return NextResponse.json({
    match,
    recommendations,
    allyActions,
    plan,
    intel,
    recentMatches: [],
    fetchedAt: frame.capturedAt,
    companion: { paired: true, hasFrame: true, source: frame.source, gameId: frame.gameId },
  });
}
