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

export function clusterForPlatform(platform: Platform): RegionalCluster {
  return PLATFORM_TO_CLUSTER[platform];
}

export const ALL_PLATFORMS = PLATFORMS;
export const ALL_CLUSTERS = REGIONAL_CLUSTERS;
