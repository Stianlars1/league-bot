/**
 * In-memory store for companion frames + subscribers.
 *
 * Phase 0 only. This works in `next dev` and on a single Fluid Compute instance
 * because requests reuse the same Node process. For production deploy across
 * multiple regions/instances we need to swap this for Vercel Marketplace
 * Postgres or Upstash Redis with a pub/sub channel — see docs/companion-app.md.
 */

import type { CompanionFrame } from "./types";

type Listener = (frame: CompanionFrame) => void;
type ClaimListener = () => void;

const frames = new Map<string, CompanionFrame>();
const listeners = new Map<string, Set<Listener>>();

// Tokens whose pairing code has been claimed by a companion. Used so the web
// UI can flip its "waiting for someone to type the code" state to
// "paired, waiting for frames" the moment claim happens — without that, a
// successful pair is invisible until the first frame arrives, which never
// happens unless a game is running.
const claimedTokens = new Set<string>();
const claimListeners = new Map<string, Set<ClaimListener>>();

export function putFrame(token: string, frame: CompanionFrame): void {
  frames.set(token, frame);
  const ls = listeners.get(token);
  if (!ls) return;
  for (const l of ls) {
    try {
      l(frame);
    } catch {
      // a single bad subscriber must not break broadcast for the rest
    }
  }
}

export function getLatestFrame(token: string): CompanionFrame | null {
  return frames.get(token) ?? null;
}

export function subscribe(token: string, listener: Listener): () => void {
  let ls = listeners.get(token);
  if (!ls) {
    ls = new Set();
    listeners.set(token, ls);
  }
  ls.add(listener);
  return () => {
    const set = listeners.get(token);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) listeners.delete(token);
  };
}

/** Test-only: count active subscribers for a token */
export function subscriberCount(token: string): number {
  return listeners.get(token)?.size ?? 0;
}

/** Mark a token as claimed and notify any active listeners. */
export function notifyClaimed(token: string): void {
  claimedTokens.add(token);
  const ls = claimListeners.get(token);
  if (!ls) return;
  for (const l of ls) {
    try {
      l();
    } catch {
      /* ignore */
    }
  }
}

export function isClaimed(token: string): boolean {
  return claimedTokens.has(token);
}

export function subscribeClaim(token: string, listener: ClaimListener): () => void {
  let ls = claimListeners.get(token);
  if (!ls) {
    ls = new Set();
    claimListeners.set(token, ls);
  }
  ls.add(listener);
  return () => {
    const set = claimListeners.get(token);
    if (!set) return;
    set.delete(listener);
    if (set.size === 0) claimListeners.delete(token);
  };
}
