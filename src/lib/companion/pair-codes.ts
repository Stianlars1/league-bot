/**
 * Pairing codes: short-lived 6-char codes mapped to long-lived companion tokens.
 *
 * Flow: web client POSTs /api/companion/pair → gets back { code, token }.
 *       Web shows the code, stores the token, subscribes to /stream?token=...
 *       Companion app POSTs /api/companion/claim with the code, gets the same
 *       token. Companion then includes that token in /ingest requests.
 *
 * Single-use codes; 5-minute TTL. In-memory only (Phase 0).
 */

import { randomBytes } from "node:crypto";

import type { PairingResult } from "./types";

// Crockford-ish alphabet — no 0/O, 1/I/L confusion
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
const CODE_TTL_MS = 5 * 60 * 1000;

interface PendingPairing {
  token: string;
  expiresAt: number;
}

const pending = new Map<string, PendingPairing>();

function genCode(): string {
  let s = "";
  const buf = randomBytes(6);
  for (let i = 0; i < 6; i++) s += ALPHABET[buf[i] % ALPHABET.length];
  return `${s.slice(0, 3)}-${s.slice(3)}`;
}

function genToken(): string {
  return randomBytes(32).toString("hex");
}

function gcExpired(now: number): void {
  for (const [k, v] of pending) {
    if (v.expiresAt < now) pending.delete(k);
  }
}

export function createPairing(): PairingResult {
  const now = Date.now();
  gcExpired(now);
  const code = genCode();
  const token = genToken();
  const expiresAt = now + CODE_TTL_MS;
  pending.set(code, { token, expiresAt });
  return { code, token, expiresAt };
}

/** Companion exchanges code → token. Single use. Returns null if invalid/expired. */
export function consumePairing(code: string): string | null {
  const norm = code.trim().toUpperCase();
  const entry = pending.get(norm);
  if (!entry) return null;
  pending.delete(norm);
  if (entry.expiresAt < Date.now()) return null;
  return entry.token;
}
