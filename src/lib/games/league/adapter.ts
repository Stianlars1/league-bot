import { and, eq } from "drizzle-orm";

import { db, schema } from "../../db/client";
import type { GameAdapter } from "../adapter";
import type { Character, Match, Participant, Player } from "../types";
import { getChampMeta } from "./data";
import {
  championImageUrl,
  getAllChampions,
  squareIconUrl,
  SUMMONER_SPELLS,
} from "./data-dragon";
import { leagueRecommender } from "./recommender";
import {
  ALL_PLATFORMS,
  activeGameByPuuid,
  clusterForPlatform,
  lookupAccount,
  type Platform,
} from "./riot-api";

const DEFAULT_PLATFORM: Platform = "euw1";

/**
 * Parse common Riot ID inputs:
 *   "Faker#KR1"             → { gameName: "Faker", tagLine: "KR1" }
 *   "Faker#KR1 (kr)"        → also returns platform: "kr"
 *   "g2 caps#euw"           → { gameName: "g2 caps", tagLine: "euw" } (platform: euw1)
 */
function parseRiotIdInput(raw: string): { gameName: string; tagLine: string; platform: Platform } {
  const cleaned = raw.trim();
  // Optional trailing "(platform)" hint
  const platformMatch = cleaned.match(/\(([a-z0-9]+)\)\s*$/i);
  let platform: Platform = DEFAULT_PLATFORM;
  let core = cleaned;
  if (platformMatch) {
    const candidate = platformMatch[1].toLowerCase();
    if ((ALL_PLATFORMS as readonly string[]).includes(candidate)) {
      platform = candidate as Platform;
    }
    core = cleaned.slice(0, platformMatch.index).trim();
  }
  const hashIdx = core.lastIndexOf("#");
  if (hashIdx === -1) {
    throw new Error('Riot ID must include "#tagLine", e.g. "Faker#KR1"');
  }
  const gameName = core.slice(0, hashIdx).trim();
  const tagLine = core.slice(hashIdx + 1).trim();
  if (!gameName || !tagLine) {
    throw new Error("Riot ID has empty game name or tag line.");
  }
  return { gameName, tagLine, platform };
}

async function lookupCharacter(numericKey: number): Promise<Character> {
  const rows = await db()
    .select()
    .from(schema.characters)
    .where(and(eq(schema.characters.gameId, "league"), eq(schema.characters.characterId, String(numericKey))))
    .limit(1);
  if (rows.length > 0) {
    const r = rows[0];
    return {
      id: ((r.raw as { id?: string } | null)?.id) ?? r.name,
      name: r.name,
      imageUrl: r.imageUrl ?? undefined,
      tags: r.tags ?? undefined,
      damageType: (r.damageType ?? "unknown") as Character["damageType"],
      archetype: r.archetype ?? undefined,
    };
  }
  // Fallback to live Data Dragon if the catalog hasn't been seeded yet
  const { version, champs } = await getAllChampions();
  const champ = champs.find((c) => Number(c.key) === numericKey);
  if (!champ) {
    return { id: String(numericKey), name: `Champion ${numericKey}`, damageType: "unknown" };
  }
  const meta = getChampMeta(champ.id);
  return {
    id: champ.id,
    name: champ.name,
    imageUrl: championImageUrl(version, champ.image.full),
    tags: meta?.tags ?? champ.tags,
    damageType: meta?.damageType ?? "unknown",
    archetype: meta?.archetype,
  };
}

function teamId(p: { teamId: number }): "blue" | "red" {
  return p.teamId === 100 ? "blue" : "red";
}

/** Heuristic position. Spectator-v5 doesn't include role; smite reliably implies jungler. */
function inferPosition(hasSmite: boolean): string | undefined {
  return hasSmite ? "JUNGLE" : undefined;
}

export const leagueAdapter: GameAdapter = {
  gameId: "league",
  displayName: "League of Legends",
  playerInputHint: 'Riot ID — e.g. "Faker#KR1"  (append "(euw1)" to set region)',
  liveDataCaveat:
    "Riot's Spectator API has a built-in ~3 minute delay. Recommendations appear once the match data unlocks.",

  recommender: leagueRecommender,

  async findPlayer(query: string): Promise<Player> {
    const { gameName, tagLine, platform } = parseRiotIdInput(query);
    const cluster = clusterForPlatform(platform);
    const account = await lookupAccount(cluster, gameName, tagLine);

    // Persist for future lookups
    await db()
      .insert(schema.players)
      .values({
        gameId: "league",
        externalId: account.puuid,
        displayName: `${account.gameName}#${account.tagLine}`,
        region: platform,
        lastSeenAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [schema.players.gameId, schema.players.externalId],
        set: {
          displayName: `${account.gameName}#${account.tagLine}`,
          region: platform,
          lastSeenAt: new Date(),
        },
      });

    return {
      gameId: "league",
      externalId: account.puuid,
      displayName: `${account.gameName}#${account.tagLine}`,
      region: platform,
    };
  },

  async getActiveMatch(player: Player): Promise<Match | null> {
    const platform = (player.region as Platform | undefined) ?? DEFAULT_PLATFORM;
    const game = await activeGameByPuuid(platform, player.externalId);
    if (!game) return null;

    // Build Participants per team, then orient teams[0] = ally relative to focused player.
    const focusedTeam = game.participants.find((p) => p.puuid === player.externalId)?.teamId ?? 100;

    const participants: Participant[] = await Promise.all(
      game.participants.map(async (p) => {
        const character = await lookupCharacter(p.championId);
        const hasSmite = p.spell1Id === 11 || p.spell2Id === 11;
        return {
          side: p.teamId === focusedTeam ? "ally" : "enemy",
          team: teamId(p),
          position: inferPosition(hasSmite),
          character,
          summonerSpells: [
            SUMMONER_SPELLS[p.spell1Id] ?? `Spell ${p.spell1Id}`,
            SUMMONER_SPELLS[p.spell2Id] ?? `Spell ${p.spell2Id}`,
          ],
          runes: p.perks
            ? {
                primary: String(p.perks.perkStyle),
                secondary: String(p.perks.perkSubStyle),
              }
            : undefined,
        } satisfies Participant;
      }),
    );

    const ally = participants.filter((p) => p.side === "ally");
    const enemy = participants.filter((p) => p.side === "enemy");

    return {
      gameId: "league",
      matchId: String(game.gameId),
      mode: game.gameMode,
      startedAt: game.gameStartTime || undefined,
      durationSeconds: game.gameLength,
      teams: [{ participants: ally }, { participants: enemy }],
      meta: { raw: game },
    };
  },

  async getCharacterCatalog(): Promise<Character[]> {
    const { version, champs } = await getAllChampions();
    return champs.map((c) => {
      const meta = getChampMeta(c.id);
      return {
        id: c.id,
        name: c.name,
        imageUrl: squareIconUrl(version, c.id),
        tags: meta?.tags ?? c.tags,
        damageType: meta?.damageType ?? "unknown",
        archetype: meta?.archetype,
      } satisfies Character;
    });
  },
};
