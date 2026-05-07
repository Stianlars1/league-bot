import { jsonb, pgTable, primaryKey, text, timestamp } from "drizzle-orm/pg-core";

// Layer-3 recommender tables (dormant — see schema-recommender.ts header).
export {
  championBuildAggregates,
  ingestState,
  matchPlayerBuilds,
} from "./schema-recommender";

/**
 * Cached player lookups: Riot ID → PUUID, Steam friend code → account_id.
 * Composite key (game_id, external_id) keeps the schema multi-game from day 1.
 */
export const players = pgTable(
  "players",
  {
    gameId: text("game_id").notNull(),
    externalId: text("external_id").notNull(),
    displayName: text("display_name"),
    region: text("region"),
    lastSeenAt: timestamp("last_seen_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.externalId] })],
);

/**
 * Live match cache. TTL is enforced in code via fetched_at; row is overwritten
 * on every fetch. Payload is the normalized Match envelope.
 */
export const matchCache = pgTable(
  "match_cache",
  {
    gameId: text("game_id").notNull(),
    externalId: text("external_id").notNull(),
    payload: jsonb("payload"),
    fetchedAt: timestamp("fetched_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.externalId] })],
);

/**
 * Static character catalog refreshed daily via /api/cron/refresh-catalog.
 * One row per (game_id, character_id). raw holds the upstream payload for
 * future fields without migrations.
 */
export const characters = pgTable(
  "characters",
  {
    gameId: text("game_id").notNull(),
    characterId: text("character_id").notNull(),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    tags: text("tags").array(),
    damageType: text("damage_type"),
    archetype: text("archetype"),
    raw: jsonb("raw"),
    version: text("version"),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (t) => [primaryKey({ columns: [t.gameId, t.characterId] })],
);
