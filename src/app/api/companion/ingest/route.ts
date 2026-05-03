import { NextResponse } from "next/server";

import { putFrame } from "@/lib/companion/store";
import type { CompanionFrame } from "@/lib/companion/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/companion/ingest
 * Authorization: Bearer <companionToken>
 * Body: CompanionFrame
 *
 * Phase 0: trust any well-formed token. We don't validate against a registry
 * yet because the registry IS the in-memory frame map. Phase 1 moves token
 * registration to a real store with rate limiting per token.
 */
export async function POST(req: Request) {
  const auth = req.headers.get("authorization") ?? "";
  const m = auth.match(/^Bearer\s+([A-Fa-f0-9]{64})$/);
  if (!m) {
    return NextResponse.json({ error: "Missing or malformed Bearer token" }, { status: 401 });
  }
  const token = m[1];

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const frame = parseFrame(body);
  if (!frame) {
    return NextResponse.json({ error: "Frame failed validation" }, { status: 400 });
  }

  putFrame(token, frame);
  return NextResponse.json({ ok: true });
}

function parseFrame(body: unknown): CompanionFrame | null {
  if (!body || typeof body !== "object") return null;
  const b = body as Record<string, unknown>;
  if (typeof b.capturedAt !== "number") return null;
  if (b.gameId !== "league" && b.gameId !== "dota") return null;
  if (b.source !== "live-client" && b.source !== "gsi") return null;
  if (b.payload === undefined) return null;
  return {
    capturedAt: b.capturedAt,
    gameId: b.gameId,
    source: b.source,
    payload: b.payload,
  };
}
