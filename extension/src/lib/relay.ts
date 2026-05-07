import { getItem, setItem } from "./storage";

// Production hostname. The dev override (relayHost in chrome.storage) always
// wins so local development doesn't need to touch this file.
const DEFAULT_HOST = "https://peeked.app";
const HOST_KEY = "relayHost";

export async function getRelayHost(): Promise<string> {
  const stored = await getItem<string>(HOST_KEY);
  return stored ?? DEFAULT_HOST;
}

export async function setRelayHost(host: string): Promise<void> {
  await setItem(HOST_KEY, host);
}

export interface IngestPayload {
  capturedAt: number;
  gameId: "league" | "dota";
  source: "live-client" | "gsi";
  payload: unknown;
}

export async function ingestFrame(
  token: string,
  payload: IngestPayload,
): Promise<boolean> {
  const host = await getRelayHost();
  try {
    const res = await fetch(`${host}/api/companion/ingest`, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(5000),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export type ClaimResult =
  | { ok: true; token: string }
  | { ok: false; reason: "network"; detail?: string }
  | { ok: false; reason: "invalid-code" }
  | { ok: false; reason: "server-error"; status: number }
  | { ok: false; reason: "malformed-token" };

export async function claimPairing(code: string): Promise<ClaimResult> {
  const host = await getRelayHost();
  let res: Response;
  try {
    res = await fetch(`${host}/api/companion/claim`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ code: code.trim().toUpperCase() }),
      signal: AbortSignal.timeout(10_000),
    });
  } catch (err) {
    return {
      ok: false,
      reason: "network",
      detail: err instanceof Error ? err.message : String(err),
    };
  }
  if (res.status >= 500) {
    return { ok: false, reason: "server-error", status: res.status };
  }
  if (!res.ok) {
    return { ok: false, reason: "invalid-code" };
  }
  let json: { token?: string };
  try {
    json = (await res.json()) as { token?: string };
  } catch {
    return { ok: false, reason: "malformed-token" };
  }
  if (typeof json.token !== "string" || !/^[A-Fa-f0-9]{64}$/.test(json.token)) {
    return { ok: false, reason: "malformed-token" };
  }
  return { ok: true, token: json.token };
}
