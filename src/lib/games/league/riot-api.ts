/**
 * Thin Riot API client. We only call:
 *  - Account-v1 (regional cluster: americas/europe/asia/sea) → PUUID + gameName/tagLine
 *  - Spectator-v5 (per-platform: euw1/na1/...) → live match
 *
 * Riots key types:
 *  - Personal dev key: 100 reqs/2 min, 20/sec, expires every 24h
 *  - Production key: granted by Riot review, higher per-app + per-method limits
 *
 * Errors thrown by this module are surface-friendly Error subclasses so the
 * route handler can map them to user-facing messages.
 */

const REGIONAL_CLUSTERS = ["americas", "europe", "asia", "sea"] as const;
export type RegionalCluster = (typeof REGIONAL_CLUSTERS)[number];

const PLATFORMS = ["br1", "eun1", "euw1", "jp1", "kr", "la1", "la2", "na1", "oc1", "tr1", "ru", "ph2", "sg2", "th2", "tw2", "vn2"] as const;
export type Platform = (typeof PLATFORMS)[number];

const PLATFORM_TO_CLUSTER: Record<Platform, RegionalCluster> = {
  br1: "americas",
  la1: "americas",
  la2: "americas",
  na1: "americas",
  euw1: "europe",
  eun1: "europe",
  tr1: "europe",
  ru: "europe",
  jp1: "asia",
  kr: "asia",
  oc1: "sea",
  ph2: "sea",
  sg2: "sea",
  th2: "sea",
  tw2: "sea",
  vn2: "sea",
};

export class RiotApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly endpoint: string,
    message: string,
  ) {
    super(message);
    this.name = "RiotApiError";
  }
}

export class RiotKeyMissingError extends Error {
  constructor() {
    super("RIOT_API_KEY is not set. Get a personal key at https://developer.riotgames.com");
    this.name = "RiotKeyMissingError";
  }
}

function apiKey() {
  const k = process.env.RIOT_API_KEY;
  if (!k) throw new RiotKeyMissingError();
  return k;
}

async function riotFetch<T>(host: string, path: string): Promise<T> {
  const url = `https://${host}.api.riotgames.com${path}`;
  const res = await fetch(url, {
    headers: { "X-Riot-Token": apiKey() },
    cache: "no-store",
  });

  if (res.status === 404) {
    throw new RiotApiError(404, path, "Not found");
  }
  if (res.status === 429) {
    const retryAfter = res.headers.get("Retry-After");
    throw new RiotApiError(
      429,
      path,
      `Rate limited by Riot API${retryAfter ? ` (retry after ${retryAfter}s)` : ""}`,
    );
  }
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new RiotApiError(res.status, path, text.slice(0, 200) || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface RiotAccount {
  puuid: string;
  gameName: string;
  tagLine: string;
}

/** Account-v1: gameName + tagLine → PUUID (region-agnostic). */
export async function lookupAccount(
  cluster: RegionalCluster,
  gameName: string,
  tagLine: string,
): Promise<RiotAccount> {
  const path = `/riot/account/v1/accounts/by-riot-id/${encodeURIComponent(gameName)}/${encodeURIComponent(tagLine)}`;
  return riotFetch<RiotAccount>(cluster, path);
}

export interface SpectatorParticipant {
  puuid: string;
  championId: number;
  teamId: number; // 100 = blue, 200 = red
  riotId?: string;
  summonerId?: string;
  spell1Id: number;
  spell2Id: number;
  perks?: { perkIds: number[]; perkStyle: number; perkSubStyle: number };
  bot?: boolean;
}

export interface SpectatorActiveGame {
  gameId: number;
  gameStartTime: number; // unix ms; 0 if game hasn't ticked yet
  gameLength: number; // seconds since game tick
  gameMode: string; // CLASSIC, ARAM, ...
  gameType: string;
  mapId: number;
  participants: SpectatorParticipant[];
  observers?: { encryptionKey: string };
  bannedChampions?: { championId: number; teamId: number; pickTurn: number }[];
  platformId: string;
}

/** Spectator-v5: live match by PUUID, 404 if not in match. */
export async function activeGameByPuuid(
  platform: Platform,
  puuid: string,
): Promise<SpectatorActiveGame | null> {
  try {
    return await riotFetch<SpectatorActiveGame>(
      platform,
      `/lol/spectator/v5/active-games/by-summoner/${encodeURIComponent(puuid)}`,
    );
  } catch (err) {
    if (err instanceof RiotApiError && err.status === 404) return null;
    throw err;
  }
}

/* ---------------- Match-v5 (regional cluster) ---------------- */

export interface MatchV5Participant {
  puuid: string;
  championId: number;
  championName: string;
  teamId: number;
  individualPosition?: string;
  teamPosition?: string;
  champLevel: number;
  kills: number;
  deaths: number;
  assists: number;
  totalMinionsKilled: number;
  neutralMinionsKilled?: number;
  goldEarned: number;
  summoner1Id: number;
  summoner2Id: number;
  perks?: { styles: { style: number; description: string; selections: { perk: number }[] }[] };
  /** Inventory slots. 0 = empty slot. item6 is the trinket. */
  item0?: number;
  item1?: number;
  item2?: number;
  item3?: number;
  item4?: number;
  item5?: number;
  item6?: number;
  win: boolean;
}

export interface MatchV5Team {
  teamId: number;
  win: boolean;
  objectives: {
    champion: { kills: number };
    tower: { kills: number };
    dragon: { kills: number };
    riftHerald: { kills: number };
    baron: { kills: number };
    inhibitor: { kills: number };
  };
}

export interface MatchV5Detail {
  metadata: { matchId: string; participants: string[] };
  info: {
    gameMode: string;
    gameType: string;
    queueId: number;
    gameDuration: number;
    gameStartTimestamp: number;
    gameEndTimestamp?: number;
    participants: MatchV5Participant[];
    teams: MatchV5Team[];
  };
}

export async function recentMatchIds(
  cluster: RegionalCluster,
  puuid: string,
  count = 1,
): Promise<string[]> {
  return riotFetch<string[]>(
    cluster,
    `/lol/match/v5/matches/by-puuid/${encodeURIComponent(puuid)}/ids?start=0&count=${count}`,
  );
}

export async function matchDetails(
  cluster: RegionalCluster,
  matchId: string,
): Promise<MatchV5Detail> {
  return riotFetch<MatchV5Detail>(cluster, `/lol/match/v5/matches/${encodeURIComponent(matchId)}`);
}

/** Combined helper: get most recent finished match's full details, or null. */
export async function lastFinishedMatch(
  cluster: RegionalCluster,
  puuid: string,
): Promise<MatchV5Detail | null> {
  const ids = await recentMatchIds(cluster, puuid, 1);
  if (ids.length === 0) return null;
  return matchDetails(cluster, ids[0]);
}

/**
 * Match-v5 IDs are prefixed with the platform the match was played on
 * ("EUW1_7840303334", "NA1_5234232", "KR_7321456"). Parsing the prefix
 * lets us auto-detect which platform a PUUID actually plays on without
 * asking the user for region.
 */
export function platformFromMatchId(matchId: string): Platform | null {
  const prefix = matchId.split("_")[0]?.toLowerCase();
  if (!prefix) return null;
  if ((ALL_PLATFORMS as readonly string[]).includes(prefix)) return prefix as Platform;
  return null;
}

/** Resolve the player's primary platform via their most recent match.
 *  Tries every cluster — Match-v5 IDs come from the cluster the match
 *  was played on, not the cluster the Riot account lives in. A KR player
 *  with a "EUW" tag will have asia-cluster matches.
 */
export async function detectPlatform(
  preferredCluster: RegionalCluster,
  puuid: string,
): Promise<Platform | null> {
  const order = [preferredCluster, "americas", "europe", "asia", "sea"].filter(
    (v, i, a) => a.indexOf(v) === i,
  ) as RegionalCluster[];
  for (const cluster of order) {
    try {
      const ids = await recentMatchIds(cluster, puuid, 3);
      for (const id of ids) {
        const p = platformFromMatchId(id);
        if (p) return p;
      }
    } catch {
      // try next cluster
    }
  }
  return null;
}

export function clusterForPlatform(platform: Platform): RegionalCluster {
  return PLATFORM_TO_CLUSTER[platform];
}

export const ALL_PLATFORMS = PLATFORMS;
export const ALL_CLUSTERS = REGIONAL_CLUSTERS;
