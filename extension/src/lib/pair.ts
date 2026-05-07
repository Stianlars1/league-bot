import { claimPairing } from "./relay";
import { getItem, removeItem, setItem } from "./storage";

const TOKEN_KEY = "companionToken";

export async function getStoredToken(): Promise<string | null> {
  const t = await getItem<string>(TOKEN_KEY);
  return t ?? null;
}

export async function pairWithCode(
  code: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!code.trim()) {
    return { ok: false, error: "Enter the 6-character pairing code." };
  }
  const result = await claimPairing(code);
  if (result.ok) {
    await setItem(TOKEN_KEY, result.token);
    return { ok: true };
  }
  switch (result.reason) {
    case "invalid-code":
      return {
        ok: false,
        error:
          "That code didn't match. It may be wrong, expired (codes last 5 minutes), or already used.",
      };
    case "network":
      return {
        ok: false,
        error:
          "Couldn't reach the Peeked relay. Check your network — or, if you've changed the host, the host setting below.",
      };
    case "server-error":
      return {
        ok: false,
        error: `Relay error (HTTP ${result.status}). Try again in a moment.`,
      };
    case "malformed-token":
      return {
        ok: false,
        error:
          "The relay returned something unexpected. Check the host setting points to a real Peeked deployment.",
      };
  }
}

export async function unpair(): Promise<void> {
  await removeItem(TOKEN_KEY);
}
