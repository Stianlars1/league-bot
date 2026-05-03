import { and, eq } from "drizzle-orm";

import { db, schema } from "../../db/client";
import type { GameAdapter } from "../adapter";
import type { Character, Match, Participant, Player } from "../types";
import { getHeroMeta } from "./data";
import {
  getHeroes,
  getPlayer,
  heroIconUrl,
  shortNameForOpenDota,
} from "./opendota";
import { dotaRecommender } from "./recommender";
import { liveMatchByAccount, StratzKeyMissingError } from "./stratz-api";

/**
 * Convert "76561198000000000" (Steam 64-bit) to Dota account_id (32-bit).
 * The lower 32 bits of a SteamID64 = account_id.
 */
function steamId64ToAccountId(steamId64: string): number | null {
  if (!/^[0-9]{16,18}$/.test(steamId64)) return null;
  try {
    const bn = BigInt(steamId64);
    return Number(bn - 76561197960265728n);
  } catch {
    return null;
  }
}

function parseDotaIdInput(raw: string): number {
  const cleaned = raw.trim();
  if (!cleaned) throw new Error("Steam ID is empty.");

  // Pure account_id (32-bit) — typical Stratz / dotabuff IDs
  if (/^\d{1,10}$/.test(cleaned)) {
    const n = Number(cleaned);
    if (n > 0 && n < 4_000_000_000) return n;
  }

  // 64-bit SteamID
  const accountId = steamId64ToAccountId(cleaned);
  if (accountId && accountId > 0) return accountId;

  // Steam profile URL
  const url = cleaned.match(/profiles\/(\d{16,18})/);
  if (url) {
    const acct = steamId64ToAccountId(url[1]);
    if (acct && acct > 0) return acct;
  }

  throw new Error(
    'Could not parse Steam ID. Use a 32-bit account ID (e.g. "108108108") or 64-bit SteamID (e.g. "76561198068373836").',
  );
}

let heroIndex: Map<number, { meta?: ReturnType<typeof getHeroMeta>; opendota: Awaited<ReturnType<typeof getHeroes>>[number] }> | null = null;

async function ensureHeroIndex() {
  if (heroIndex) return heroIndex;
  const heroes = await getHeroes();
  heroIndex = new Map(
    heroes.map((h) => {
      const shortName = shortNameForOpenDota(h);
      return [h.id, { meta: getHeroMeta(shortName), opendota: h }] as const;
    }),
  );
  return heroIndex;
}

async function lookupHero(heroId: number): Promise<Character> {
  // Try DB first
  const rows = await db()
    .select()
    .from(schema.characters)
    .where(and(eq(schema.characters.gameId, "dota"), eq(schema.characters.characterId, String(heroId))))
    .limit(1);
  if (rows.length > 0) {
    const r = rows[0];
    return {
      id: ((r.raw as { shortName?: string } | null)?.shortName) ?? r.name,
      name: r.name,
      imageUrl: r.imageUrl ?? undefined,
      tags: r.tags ?? undefined,
      damageType: (r.damageType ?? "unknown") as Character["damageType"],
      archetype: r.archetype ?? undefined,
    };
  }

  // Fallback to live OpenDota fetch
  const idx = await ensureHeroIndex();
  const entry = idx.get(heroId);
  if (!entry) {
    return { id: String(heroId), name: `Hero ${heroId}`, damageType: "unknown" };
  }
  const shortName = shortNameForOpenDota(entry.opendota);
  return {
    id: shortName,
    name: entry.opendota.localized_name,
    imageUrl: heroIconUrl(shortName),
    tags: entry.meta?.tags,
    damageType: entry.meta?.damageType ?? "unknown",
    archetype: entry.meta?.roles[0] ?? entry.opendota.roles[0],
  };
}

export const dotaAdapter: GameAdapter = {
  gameId: "dota",
  displayName: "Dota 2",
  playerInputHint:
    'Steam account ID (32-bit) or full SteamID64 — e.g. "108108108" or "76561198068373836"',
  liveDataCaveat:
    "Stratz live coverage is best-effort. Some public matches may not appear immediately.",

  recommender: dotaRecommender,

  async findPlayer(query: string): Promise<Player> {
    const accountId = parseDotaIdInput(query);
    const profile = await getPlayer(accountId);
    const displayName = profile.profile?.personaname ?? `Account ${accountId}`;

    await db()
      .insert(schema.players)
      .values({
        gameId: "dota",
        externalId: String(accountId),
        displayName,
        region: profile.profile?.loccountrycode ?? null,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.players.gameId, schema.players.externalId],
        set: {
          displayName,
          region: profile.profile?.loccountrycode ?? null,
          lastSeenAt: new Date(),
        },
      });

    return {
      gameId: "dota",
      externalId: String(accountId),
      displayName,
      region: profile.profile?.loccountrycode ?? undefined,
    };
  },

  async getActiveMatch(player: Player): Promise<Match | null> {
    const accountId = Number(player.externalId);
    let game;
    try {
      game = await liveMatchByAccount(accountId);
    } catch (err) {
      // STRATZ is optional and historically flaky for indie devs (login broken,
      // no public key issuance for some users). Treat any failure as "no live
      // match" — the user still gets the static catalog and recommender.
      // True realtime ships via Counter Companion + Dota GSI in Phase 1.
      if (err instanceof StratzKeyMissingError) return null;
      console.warn("[dota] live fetch failed, falling through to no-live:", err);
      return null;
    }
    if (!game) return null;

    const focused = game.players.find((p) => p.steamAccountId === accountId);
    const focusedRadiant = focused?.isRadiant ?? true;

    const participants: Participant[] = await Promise.all(
      game.players.map(async (p) => {
        const character = await lookupHero(p.heroId);
        return {
          side: p.isRadiant === focusedRadiant ? "ally" : "enemy",
          team: p.isRadiant ? "radiant" : "dire",
          character,
        } satisfies Participant;
      }),
    );

    const ally = participants.filter((p) => p.side === "ally");
    const enemy = participants.filter((p) => p.side === "enemy");

    return {
      gameId: "dota",
      matchId: String(game.matchId),
      mode: game.gameMode ?? undefined,
      durationSeconds: game.gameTime,
      teams: [{ participants: ally }, { participants: enemy }],
      meta: { raw: game },
    };
  },

  async getCharacterCatalog(): Promise<Character[]> {
    const heroes = await getHeroes();
    return heroes.map((h) => {
      const shortName = shortNameForOpenDota(h);
      const meta = getHeroMeta(shortName);
      return {
        id: shortName,
        name: h.localized_name,
        imageUrl: heroIconUrl(shortName),
        tags: meta?.tags,
        damageType: meta?.damageType ?? "unknown",
        archetype: meta?.roles[0] ?? h.roles[0],
      } satisfies Character;
    });
  },
};
