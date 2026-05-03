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

const frames = new Map<string, CompanionFrame>();
const listeners = new Map<string, Set<Listener>>();

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
