/**
 * Counter Companion wire types.
 *
 * The Companion lives on the player's machine, polls Riot's Live Client Data
 * API at 127.0.0.1:2999, and pushes frames here. The webapp subscribes to
 * /api/companion/stream?token=... and receives the latest frame as SSE events.
 *
 * In Phase 0 we accept the raw `/allgamedata` body verbatim under `payload`.
 * Game adapters know how to normalise it into our `Match` shape.
 */

export type CompanionGameId = "league" | "dota";

export type CompanionSource = "live-client" | "gsi";

export interface CompanionFrame {
  /** ms epoch on the companion machine when the snapshot was captured */
  capturedAt: number;
  gameId: CompanionGameId;
  source: CompanionSource;
  /** Raw upstream payload (Riot Live Client `allgamedata` or Dota GSI body) */
  payload: unknown;
}

export interface PairingResult {
  /** 6-char human-typeable code shown in the web UI, e.g. "K3F-9PD" */
  code: string;
  /** 256-bit opaque token the companion will use for ingest auth */
  token: string;
  /** ms epoch the code stops being claimable */
  expiresAt: number;
}
