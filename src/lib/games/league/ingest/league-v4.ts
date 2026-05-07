/**
 * League-V4 endpoint wrappers — used by the layer-3 ingest cron to find
 * Master+ summoner IDs whose ranked games we then fetch via Match-V5.
 *
 * Bodies are implemented but the cron route guards every call behind
 * RECOMMENDER_LAYER_3_INGEST. Flag stays `false` until a Personal
 * Application Key is approved — a dev key would burn its 24h quota in
 * minutes at the cron's intended throughput.
 *
 * Rate-limit strategy: 50 ms gap between sequential calls + one retry
 * on 429 honoring Retry-After. Conservative under PAK's 500/10s burst.
 */

const RIOT_PLATFORM_HOSTS: Record<string, string> = {
  EUW1: "https://euw1.api.riotgames.com",
  NA1: "https://na1.api.riotgames.com",
  KR: "https://kr.api.riotgames.com",
  EUN1: "https://eun1.api.riotgames.com",
  BR1: "https://br1.api.riotgames.com",
  JP1: "https://jp1.api.riotgames.com",
  LA1: "https://la1.api.riotgames.com",
  LA2: "https://la2.api.riotgames.com",
  OC1: "https://oc1.api.riotgames.com",
  TR1: "https://tr1.api.riotgames.com",
  RU: "https://ru.api.riotgames.com",
  PH2: "https://ph2.api.riotgames.com",
  SG2: "https://sg2.api.riotgames.com",
  TH2: "https://th2.api.riotgames.com",
  TW2: "https://tw2.api.riotgames.com",
  VN2: "https://vn2.api.riotgames.com",
};

export interface LeagueEntry {
  summonerId: string;
  puuid?: string;
  leaguePoints: number;
  rank: string; // I, II, III, IV
  wins: number;
  losses: number;
}

export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Minimal Riot fetch shared by ingest modules. Throws plain `Error` so the
 * ingest path stays decoupled from `riot-api.ts` (which is shaped for the
 * live-match request flow). Error messages start with the HTTP status so
 * callers can pattern-match `"404 "` to convert into null-returns.
 */
export async function riotGet<T>(host: string, path: string, apiKey: string): Promise<T> {
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(`${host}${path}`, {
      headers: { "X-Riot-Token": apiKey },
      cache: "no-store",
    });
    if (res.status === 429) {
      if (attempt === 0) {
        const raw = Number(res.headers.get("Retry-After") ?? "1");
        const sec = Number.isFinite(raw) && raw > 0 ? Math.min(raw, 10) : 1;
        await sleep(sec * 1000);
        continue;
      }
      throw new Error(`429 ${path} after retry`);
    }
    if (res.status >= 500 && res.status < 600) {
      if (attempt === 0) {
        await sleep(200);
        continue;
      }
      throw new Error(`${res.status} ${path} after retry`);
    }
    if (!res.ok) {
      throw new Error(`${res.status} ${path}`);
    }
    return (await res.json()) as T;
  }
  // Loop always returns or throws above; this satisfies the type checker.
  throw new Error(`unreachable: ${path}`);
}

interface LeagueListResponse {
  entries: LeagueEntry[];
}

/**
 * Returns Master+ summoner IDs in a region, sorted by LP desc.
 *
 * Endpoints (all under /lol/league/v4/):
 *   - /challengerleagues/by-queue/RANKED_SOLO_5x5
 *   - /grandmasterleagues/by-queue/RANKED_SOLO_5x5
 *   - /masterleagues/by-queue/RANKED_SOLO_5x5
 *
 * If a single tier 4xx's it is swallowed — partial data beats no data.
 */
export async function fetchHighEloSummoners(args: {
  region: keyof typeof RIOT_PLATFORM_HOSTS;
  apiKey: string;
  limit?: number;
}): Promise<LeagueEntry[]> {
  const host = RIOT_PLATFORM_HOSTS[args.region];
  if (!host) return [];

  const tiers = ["challengerleagues", "grandmasterleagues", "masterleagues"] as const;
  const all: LeagueEntry[] = [];

  for (const tier of tiers) {
    try {
      const list = await riotGet<LeagueListResponse>(
        host,
        `/lol/league/v4/${tier}/by-queue/RANKED_SOLO_5x5`,
        args.apiKey,
      );
      if (Array.isArray(list?.entries)) all.push(...list.entries);
    } catch {
      // Single-tier failure: keep what we have from the other two.
    }
    await sleep(50);
  }

  all.sort((a, b) => b.leaguePoints - a.leaguePoints);
  return typeof args.limit === "number" ? all.slice(0, args.limit) : all;
}

interface SummonerResponse {
  puuid: string;
}

/** Resolve a summonerId → puuid via /lol/summoner/v4/summoners/{id}.
 *  Required because Match-V5 keys games by puuid, not summonerId. */
export async function summonerIdToPuuid(args: {
  region: keyof typeof RIOT_PLATFORM_HOSTS;
  summonerId: string;
  apiKey: string;
}): Promise<string | null> {
  const host = RIOT_PLATFORM_HOSTS[args.region];
  if (!host) return null;

  try {
    const summoner = await riotGet<SummonerResponse>(
      host,
      `/lol/summoner/v4/summoners/${encodeURIComponent(args.summonerId)}`,
      args.apiKey,
    );
    return summoner?.puuid ?? null;
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("404 ")) return null;
    throw err;
  }
}

export { RIOT_PLATFORM_HOSTS };
