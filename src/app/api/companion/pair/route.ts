import { NextResponse } from "next/server";

import { createPairing } from "@/lib/companion/pair-codes";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * POST /api/companion/pair
 * Web client requests a one-time pairing code. Response includes the long-lived
 * companion token; the web client stores it, displays the code, and subscribes
 * to /api/companion/stream?token=... immediately. The token only emits frames
 * once the companion app POSTs /claim with the same code and starts ingesting.
 */
export async function POST() {
  const result = createPairing();
  return NextResponse.json(result);
}
