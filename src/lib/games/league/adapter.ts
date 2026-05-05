import { and, eq } from "drizzle-orm";

import { db, schema } from "../../db/client";
import type { GameAdapter } from "../adapter";
import type { Character, Match, MatchSummary, Participant, Player } from "../types";
import { getChampMeta } from "./data";
import {
  championImageUrl,
  getAllChampions,
  itemImageUrl,
  squareIconUrl,
  SUMMONER_SPELLS,
} from "./data-dragon";
import { leagueRecommender } from "./recommender";
import {
  ALL_PLATFORMS,
  activeGameByPuuid,
  clusterForPlatform,
  detectPlatform,
  lastFinishedMatch,
  lookupAccount,
  matchDetails,
  recentMatchIds,
  type MatchV5Detail,
  type Platform,
  type RegionalCluster,
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

/**
 * Heuristic position. Spectator-v5 doesn't expose `individualPosition` or
 * `teamPosition` (those only exist on Match-v5), so we infer from signals
 * that ARE in the payload:
 *   - Smite presence → JUNGLE (≈99% reliable; trolls sometimes break this)
 *   - Support archetype/tag → UTILITY (≈90% reliable)
 * For TOP / MIDDLE / BOTTOM the signal is too noisy from kit alone — leave
 * undefined. UI consumers (lane-matchups, power-spike role rates) already
 * tolerate missing positions.
 */
function inferPosition(hasSmite: boolean, character?: Character): string | undefined {
  if (hasSmite) return "JUNGLE";
  if (character?.archetype === "support") return "UTILITY";
  if (character?.tags?.some((t) => t.toLowerCase() === "support")) return "UTILITY";
  return undefined;
}

/**
 * Match-v5 has full per-participant stats + team objectives. We use this as a
 * fallback when Spectator-v5 returns null (player not in a live match, or
 * Riot is filtering them) — the user still sees a richly analyzed match.
 */
export async function convertMatchV5(detail: MatchV5Detail, focusedPuuid: string): Promise<Match> {
  const focused = detail.info.participants.find((p) => p.puuid === focusedPuuid);
  const focusedTeamId = focused?.teamId ?? 100;
  const { version: ddVersion } = await getAllChampions();

  const participants: Participant[] = await Promise.all(
    detail.info.participants.map(async (p) => {
      const character = await lookupCharacter(p.championId);
      // Match-v5 includes resolved position — use it instead of guessing
      const position =
        p.teamPosition && p.teamPosition !== ""
          ? p.teamPosition
          : p.individualPosition && p.individualPosition !== "Invalid"
            ? p.individualPosition
            : undefined;
      // Inventory: filter empty slots (id 0). Trinket (item6) included.
      const itemSlots = [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6]
        .filter((id): id is number => typeof id === "number" && id > 0);
      return {
        side: p.teamId === focusedTeamId ? "ally" : "enemy",
        team: p.teamId === 100 ? "blue" : "red",
        position,
        character,
        summonerSpells: [
          SUMMONER_SPELLS[p.summoner1Id] ?? `Spell ${p.summoner1Id}`,
          SUMMONER_SPELLS[p.summoner2Id] ?? `Spell ${p.summoner2Id}`,
        ],
        runes: p.perks
          ? {
              primary: String(p.perks.styles?.[0]?.style ?? ""),
              secondary: String(p.perks.styles?.[1]?.style ?? ""),
            }
          : undefined,
        items: itemSlots.length > 0 ? itemSlots.map(String) : undefined,
        itemImageUrls:
          itemSlots.length > 0 ? itemSlots.map((id) => itemImageUrl(ddVersion, id)) : undefined,
        stats: {
          kills: p.kills,
          deaths: p.deaths,
          assists: p.assists,
          cs: p.totalMinionsKilled + (p.neutralMinionsKilled ?? 0),
          gold: p.goldEarned,
          level: p.champLevel,
        },
      } satisfies Participant;
    }),
  );

  const ally = participants.filter((p) => p.side === "ally");
  const enemy = participants.filter((p) => p.side === "enemy");

  const allyTeamId = focusedTeamId;
  const enemyTeamId = focusedTeamId === 100 ? 200 : 100;
  const allyTeam = detail.info.teams.find((t) => t.teamId === allyTeamId);
  const enemyTeam = detail.info.teams.find((t) => t.teamId === enemyTeamId);
  const sumScore = (t?: MatchV5Detail["info"]["teams"][number]) => ({
    kills: t?.objectives.champion.kills ?? 0,
    towers: t?.objectives.tower.kills ?? 0,
    drakes: t?.objectives.dragon.kills ?? 0,
    heralds: t?.objectives.riftHerald.kills ?? 0,
    barons: t?.objectives.baron.kills ?? 0,
    inhibitors: t?.objectives.inhibitor.kills ?? 0,
  });

  const endedAt = detail.info.gameEndTimestamp ?? detail.info.gameStartTimestamp + detail.info.gameDuration * 1000;

  return {
    gameId: "league",
    matchId: String(detail.metadata.matchId),
    mode: detail.info.gameMode,
    startedAt: detail.info.gameStartTimestamp,
    durationSeconds: detail.info.gameDuration,
    teams: [{ participants: ally }, { participants: enemy }],
    liveStats: {
      gameTimeSeconds: detail.info.gameDuration,
      source: "post-game",
      endedMsAgo: Math.max(0, Date.now() - endedAt),
      scores: { ally: sumScore(allyTeam), enemy: sumScore(enemyTeam) },
    },
    meta: { raw: detail },
  };
}

export const leagueAdapter: GameAdapter = {
  gameId: "league",
  displayName: "League of Legends",
  playerInputHint: 'Riot ID — e.g. "Faker#KR1"  (append "(euw1)" to set region)',
  liveDataCaveat:
    "Riot's Spectator API has a built-in ~3 minute delay. Recommendations appear once the match data unlocks.",

  recommender: leagueRecommender,

  async findPlayer(query: string): Promise<Player> {
    const { gameName, tagLine, platform: hint } = parseRiotIdInput(query);
    // Account-v1 is region-agnostic — try every cluster until one finds the
    // account. This means a user typing "Faker#KR1" without "(kr)" still
    // resolves correctly even if the default cluster is europe.
    const initialCluster = clusterForPlatform(hint);
    const clusters = [initialCluster, "americas", "europe", "asia", "sea"].filter(
      (v, i, a) => a.indexOf(v) === i,
    ) as RegionalCluster[];

    let account: Awaited<ReturnType<typeof lookupAccount>> | null = null;
    let resolvedCluster: RegionalCluster = initialCluster;
    for (const cluster of clusters) {
      try {
        account = await lookupAccount(cluster, gameName, tagLine);
        resolvedCluster = cluster;
        break;
      } catch {
        // try next cluster
      }
    }
    if (!account) {
      throw new Error(`No Riot account matches "${gameName}#${tagLine}" in any region.`);
    }

    // Detect actual platform via Match-v5 ID prefix instead of guessing.
    // Falls back to the parser hint if the player has no public matches.
    const detected = await detectPlatform(resolvedCluster, account.puuid);
    const platform: Platform = detected ?? hint;

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

  async getLastFinishedMatch(player: Player): Promise<Match | null> {
    const platform = (player.region as Platform | undefined) ?? DEFAULT_PLATFORM;
    const cluster = clusterForPlatform(platform);
    const detail = await lastFinishedMatch(cluster, player.externalId);
    if (!detail) return null;
    return await convertMatchV5(detail, player.externalId);
  },

  async getRecentMatches(player: Player, limit = 5): Promise<MatchSummary[]> {
    const platform = (player.region as Platform | undefined) ?? DEFAULT_PLATFORM;
    const cluster = clusterForPlatform(platform);
    const ids = await recentMatchIds(cluster, player.externalId, limit);
    if (ids.length === 0) return [];
    const details = await Promise.all(
      ids.map((id) => matchDetails(cluster, id).catch(() => null)),
    );
    const summaries: MatchSummary[] = [];
    for (const d of details) {
      if (!d) continue;
      const me = d.info.participants.find((p) => p.puuid === player.externalId);
      if (!me) continue;
      const character = await lookupCharacter(me.championId);
      const endedAt = d.info.gameEndTimestamp ?? d.info.gameStartTimestamp + d.info.gameDuration * 1000;
      summaries.push({
        matchId: d.metadata.matchId,
        championId: character.id,
        championName: character.name,
        championImageUrl: character.imageUrl,
        win: me.win,
        kda: { kills: me.kills, deaths: me.deaths, assists: me.assists },
        cs: me.totalMinionsKilled + (me.neutralMinionsKilled ?? 0),
        durationSeconds: d.info.gameDuration,
        endedMsAgo: Math.max(0, Date.now() - endedAt),
        mode: d.info.gameMode,
        position: me.teamPosition || me.individualPosition,
      });
    }
    return summaries;
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
          position: inferPosition(hasSmite, character),
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
      // Spectator-v5 doesn't expose live KDA / scores / objectives by Riot policy.
      // We still surface gameTimeSeconds + a flag so the UI can degrade gracefully.
      liveStats: {
        gameTimeSeconds: game.gameLength,
        source: "spectator-only",
        scores: {
          ally: { kills: 0, towers: 0, drakes: 0, heralds: 0, barons: 0, inhibitors: 0 },
          enemy: { kills: 0, towers: 0, drakes: 0, heralds: 0, barons: 0, inhibitors: 0 },
        },
      },
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
