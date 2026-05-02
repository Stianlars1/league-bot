import { NextResponse } from "next/server";

import { getAdapter, isGameId } from "@/lib/games/registry";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { game?: string; query?: string };
  try {
    body = (await req.json()) as { game?: string; query?: string };
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const game = body.game ?? "";
  const query = (body.query ?? "").trim();

  if (!isGameId(game)) {
    return NextResponse.json({ error: "Unknown game" }, { status: 400 });
  }
  if (!query) {
    return NextResponse.json({ error: "Empty player query" }, { status: 400 });
  }

  try {
    const adapter = getAdapter(game);
    const player = await adapter.findPlayer(query);
    return NextResponse.json({ player });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Lookup failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
