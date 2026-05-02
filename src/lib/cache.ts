import { and, eq } from "drizzle-orm";

import { db, schema } from "./db/client";
import type { GameId } from "./games/types";

/**
 * In-process pending-promise dedupe. If two concurrent requests ask for the
 * same key while an upstream fetch is in flight, the second one awaits the
 * first one's promise instead of triggering its own network call.
 *
 * Note: this only dedupes within a single function instance. Fluid Compute
 * reuses instances aggressively, so under load most concurrent requests will
 * land on the same instance — Postgres cache covers cross-instance dedupe.
 */
const pending = new Map<string, Promise<unknown>>();

interface CachedFetchOptions<T> {
  gameId: GameId;
  externalId: string;
  ttlSeconds: number;
  fetcher: () => Promise<T | null>;
  /**
   * If the upstream returned null (e.g. "not in match"), should we still cache
   * that null for `nullTtlSeconds`? Defaults to short TTL to avoid hammering.
   */
  nullTtlSeconds?: number;
}

/**
 * Cached fetch for live match data: Postgres-backed with TTL and in-process
 * dedupe. Returns the cached value if it's fresh, otherwise refreshes.
 */
export async function cachedMatch<T>(opts: CachedFetchOptions<T>): Promise<T | null> {
  const { gameId, externalId, ttlSeconds, fetcher, nullTtlSeconds = 10 } = opts;
  const cacheKey = `match:${gameId}:${externalId}`;

  const now = Date.now();
  const fresh = await readMatchCache<T>(gameId, externalId);
  if (fresh) {
    const age = (now - fresh.fetchedAt.getTime()) / 1000;
    const ttl = fresh.payload === null ? nullTtlSeconds : ttlSeconds;
    if (age < ttl) return fresh.payload;
  }

  // Dedupe concurrent in-flight requests
  const existing = pending.get(cacheKey);
  if (existing) return (await existing) as T | null;

  const promise = (async () => {
    try {
      const result = await fetcher();
      await writeMatchCache(gameId, externalId, result);
      return result;
    } finally {
      pending.delete(cacheKey);
    }
  })();
  pending.set(cacheKey, promise);
  return (await promise) as T | null;
}

async function readMatchCache<T>(gameId: GameId, externalId: string) {
  const rows = await db()
    .select()
    .from(schema.matchCache)
    .where(and(eq(schema.matchCache.gameId, gameId), eq(schema.matchCache.externalId, externalId)))
    .limit(1);
  if (rows.length === 0) return null;
  const row = rows[0];
  return {
    payload: (row.payload ?? null) as T | null,
    fetchedAt: row.fetchedAt,
  };
}

async function writeMatchCache(gameId: GameId, externalId: string, payload: unknown) {
  await db()
    .insert(schema.matchCache)
    .values({ gameId, externalId, payload: payload as never, fetchedAt: new Date() })
    .onConflictDoUpdate({
      target: [schema.matchCache.gameId, schema.matchCache.externalId],
      set: { payload: payload as never, fetchedAt: new Date() },
    });
}
