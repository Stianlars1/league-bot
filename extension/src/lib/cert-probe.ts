const LIVE_CLIENT_URL = "https://127.0.0.1:2999/liveclientdata/allgamedata";

/**
 * Returns true if the local Live Client API responded with ANY HTTP status,
 * which means the cert is accepted by this browser. Returns false if fetch
 * threw — could be cert rejection OR no game running. Distinguishing those
 * two cases reliably from JS isn't possible, so the popup combines this
 * signal with "have we ever ingested a frame on this token" to decide
 * whether to surface the cert-acceptance prompt or the "waiting for game"
 * state.
 */
export async function probeLiveClient(): Promise<boolean> {
  try {
    await fetch(LIVE_CLIENT_URL, { signal: AbortSignal.timeout(3000) });
    return true;
  } catch {
    return false;
  }
}

export const LIVE_CLIENT_PROBE_URL = LIVE_CLIENT_URL;
