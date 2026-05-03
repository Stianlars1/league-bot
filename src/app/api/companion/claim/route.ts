import { NextResponse } from "next/server";

import { consumePairing } from "@/lib/companion/pair-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface ClaimBody {
  code?: string;
}

/**
 * POST /api/companion/claim { code }
 * Companion exchanges a pairing code for the long-lived companion token.
 * Single-use; 5-minute TTL on the code.
 */
export async function POST(req: Request) {
  let body: ClaimBody;
  try {
    body = (await req.json()) as ClaimBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const code = body.code?.trim();
  if (!code) {
    return NextResponse.json({ error: "Missing code" }, { status: 400 });
  }
  const token = consumePairing(code);
  if (!token) {
    return NextResponse.json({ error: "Invalid or expired pairing code" }, { status: 404 });
  }
  return NextResponse.json({ token });
}
