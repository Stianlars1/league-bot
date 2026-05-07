/**
 * Match-V5 endpoint wrappers — fetches a player's recent ranked matches
 * and the per-match detail + timeline used to derive build orders.
 *
 * Bodies implemented; cron remains dormant via RECOMMENDER_LAYER_3_INGEST.
 *
 * The Match-V5 raw types here are deliberately separate from the
 * `MatchV5Detail` exported by `riot-api.ts` — that one is shaped for the
 * live-match recommender (KDA, items, perks). Ingest needs a different
 * subset (gameVersion for patch filtering, item slots 0..6 for finalBuild)
 * and shouldn't widen the live-match type to accommodate it.
 */

import { riotGet, sleep } from "./league-v4";
import { isCurrentPatch, toPatchId } from "./patch-tracking";

const RIOT_REGIONAL_HOSTS = {
  americas: "https://americas.api.riotgames.com",
  europe: "https://europe.api.riotgames.com",
  asia: "https://asia.api.riotgames.com",
  sea: "https://sea.api.riotgames.com",
} as const;

export type RegionalCluster = keyof typeof RIOT_REGIONAL_HOSTS;

/** Subset of Match-V5 we care about for build-aggregate ingest. */
export interface MatchV5Snapshot {
  matchId: string;
  patch: string; // "14.24" — derived from gameVersion
  region: string;
  queueId: number; // 420 = Ranked Solo/Duo
  gameLengthSeconds: number;
  participants: {
    puuid: string;
    championId: number;
    championName: string;
    teamPosition: string; // TOP / JUNGLE / MIDDLE / BOTTOM / UTILITY
    win: boolean;
    finalBuild: string[]; // Riot item IDs as strings
    teamId: number; // 100 = blue, 200 = red
  }[];
}

/** Per-item completion times from Match-V5 timeline. */
export interface BuildPacing {
  puuid: string;
  itemBuilds: { itemId: string; minute: number }[];
}

interface RawMatchDetail {
  metadata: { matchId: string };
  info: {
    queueId: number;
    gameDuration: number;
    gameVersion: string;
    participants: {
      puuid: string;
      championId: number;
      championName: string;
      teamPosition: string;
      win: boolean;
      teamId: number;
      item0?: number;
      item1?: number;
      item2?: number;
      item3?: number;
      item4?: number;
      item5?: number;
      item6?: number;
    }[];
  };
}

interface RawTimelineEvent {
  type: string;
  timestamp: number; // ms since game start
  participantId?: number; // 1-10
  itemId?: number;
}

interface RawTimeline {
  info: {
    frames: { events: RawTimelineEvent[]; timestamp: number }[];
    participants?: { participantId: number; puuid: string }[];
  };
}

/**
 * Fetch the IDs of a puuid's last N ranked solo/duo games.
 *
 * Endpoint: GET /lol/match/v5/matches/by-puuid/{puuid}/ids?type=ranked&queue=420
 */
export async function fetchRankedMatchIds(args: {
  cluster: RegionalCluster;
  puuid: string;
  apiKey: string;
  limit?: number;
}): Promise<string[]> {
  const host = RIOT_REGIONAL_HOSTS[args.cluster];
  const limit = args.limit ?? 20;
  try {
    return await riotGet<string[]>(
      host,
      `/lol/match/v5/matches/by-puuid/${encodeURIComponent(args.puuid)}/ids?type=ranked&queue=420&start=0&count=${limit}`,
      args.apiKey,
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("404 ")) return [];
    throw err;
  }
}

/**
 * Fetch a Match-V5 match detail + timeline, normalized for ingest.
 *
 * Returns null if:
 *   - The match isn't ranked solo/duo (queueId !== 420)
 *   - The match wasn't played on the current patch
 *   - Either endpoint 404's
 *
 * Other errors propagate to the caller's per-region try/catch.
 */
export async function fetchMatchSnapshot(args: {
  cluster: RegionalCluster;
  matchId: string;
  apiKey: string;
  currentPatchId: string;
}): Promise<{ snapshot: MatchV5Snapshot; pacing: BuildPacing[] } | null> {
  const host = RIOT_REGIONAL_HOSTS[args.cluster];

  let detail: RawMatchDetail;
  try {
    detail = await riotGet<RawMatchDetail>(
      host,
      `/lol/match/v5/matches/${encodeURIComponent(args.matchId)}`,
      args.apiKey,
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("404 ")) return null;
    throw err;
  }
  await sleep(50);

  if (detail.info.queueId !== 420) return null;
  if (!isCurrentPatch(detail.info.gameVersion, args.currentPatchId)) return null;

  let timeline: RawTimeline;
  try {
    timeline = await riotGet<RawTimeline>(
      host,
      `/lol/match/v5/matches/${encodeURIComponent(args.matchId)}/timeline`,
      args.apiKey,
    );
  } catch (err) {
    if (err instanceof Error && err.message.startsWith("404 ")) return null;
    throw err;
  }
  await sleep(50);

  const participants = detail.info.participants.map((p) => ({
    puuid: p.puuid,
    championId: p.championId,
    championName: p.championName,
    teamPosition: p.teamPosition,
    win: p.win,
    teamId: p.teamId,
    finalBuild: [p.item0, p.item1, p.item2, p.item3, p.item4, p.item5, p.item6]
      .filter((id): id is number => typeof id === "number" && id > 0)
      .map(String),
  }));

  // participantId (1..10) → puuid. Match-V5 timeline guarantees this index
  // matches detail.info.participants order; we prefer the timeline's own
  // participants array when present and fall back to positional mapping.
  const idToPuuid = new Map<number, string>();
  if (Array.isArray(timeline.info.participants)) {
    for (const tp of timeline.info.participants) {
      idToPuuid.set(tp.participantId, tp.puuid);
    }
  }
  detail.info.participants.forEach((p, i) => {
    if (!idToPuuid.has(i + 1)) idToPuuid.set(i + 1, p.puuid);
  });

  // Per-puuid finalBuild lookup. ITEM_PURCHASED events for items not in the
  // final inventory are dropped — that filters out components and consumables
  // and keeps us with the moments each completed legendary entered the build.
  const finalBuildByPuuid = new Map<string, Set<string>>();
  for (const p of participants) {
    finalBuildByPuuid.set(p.puuid, new Set(p.finalBuild));
  }

  const itemBuildsByPuuid = new Map<string, { itemId: string; minute: number }[]>();
  for (const frame of timeline.info.frames) {
    for (const ev of frame.events) {
      if (ev.type !== "ITEM_PURCHASED") continue;
      if (typeof ev.participantId !== "number" || typeof ev.itemId !== "number") continue;
      const puuid = idToPuuid.get(ev.participantId);
      if (!puuid) continue;
      const wanted = finalBuildByPuuid.get(puuid);
      if (!wanted) continue;
      const itemIdStr = String(ev.itemId);
      if (!wanted.has(itemIdStr)) continue;

      const list = itemBuildsByPuuid.get(puuid) ?? [];
      list.push({ itemId: itemIdStr, minute: ev.timestamp / 60000 });
      itemBuildsByPuuid.set(puuid, list);
    }
  }

  const pacing: BuildPacing[] = [];
  for (const [puuid, items] of itemBuildsByPuuid) {
    items.sort((a, b) => a.minute - b.minute);
    pacing.push({ puuid, itemBuilds: items });
  }

  const snapshot: MatchV5Snapshot = {
    matchId: detail.metadata.matchId,
    patch: toPatchId(detail.info.gameVersion),
    region: args.cluster,
    queueId: detail.info.queueId,
    gameLengthSeconds: detail.info.gameDuration,
    participants,
  };

  return { snapshot, pacing };
}

export { RIOT_REGIONAL_HOSTS };
