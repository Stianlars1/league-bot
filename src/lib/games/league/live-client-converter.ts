/**
 * Riot Live Client Data API → normalized `Match` shape.
 *
 * The Counter Companion polls https://127.0.0.1:2999/liveclientdata/allgamedata
 * on the player's machine and pushes the body verbatim under
 * `CompanionFrame.payload`. This module turns that raw body into the same
 * `Match` envelope the rest of the app already understands, so recommender /
 * intel / ally-actions work unchanged.
 *
 * Compared to Spectator-v5 (`convertActiveMatch` in adapter.ts) the Live Client
 * gives us four things Spectator does NOT:
 *   - per-player live KDA + CS
 *   - per-player level
 *   - resolved position (TOP/JUNGLE/MIDDLE/BOTTOM/UTILITY)
 *   - an event log we can aggregate into team-level scores (kills, towers,
 *     drakes, heralds, barons, inhibitors)
 *
 * It does NOT give us:
 *   - enemy ability cooldowns
 *   - enemy summoner-spell cooldowns
 *   - enemy ult timers
 *   (Riot's anti-cheat guardrail — there's no API for these on purpose.)
 */

import type {
  Character,
  Match,
  Participant,
  Side,
  TeamScore,
} from "../types";
import { getChampMeta } from "./data";
import {
  championImageUrl,
  getAllChampions,
  type DDragonChampion,
  SUMMONER_SPELLS,
} from "./data-dragon";

// ============================================================================
// Live Client API shape (subset we use). Riot doesn't publish a typed schema
// so this lives here — keep it narrow and forgiving.
// ============================================================================

export interface LiveClientPlayer {
  summonerName?: string;
  riotId?: string;
  riotIdGameName?: string;
  riotIdTagLine?: string;
  championName?: string;
  rawChampionName?: string;
  team?: "ORDER" | "CHAOS";
  position?: "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY" | "";
  level?: number;
  isDead?: boolean;
  isBot?: boolean;
  scores?: {
    kills: number;
    deaths: number;
    assists: number;
    creepScore: number;
    wardScore?: number;
  };
  summonerSpells?: {
    summonerSpellOne?: { displayName?: string; rawDisplayName?: string };
    summonerSpellTwo?: { displayName?: string; rawDisplayName?: string };
  };
  runes?: {
    keystone?: { id?: number; displayName?: string };
    primaryRuneTree?: { id?: number; displayName?: string };
    secondaryRuneTree?: { id?: number; displayName?: string };
  };
}

export interface LiveClientEvent {
  EventID?: number;
  EventName?: string;
  EventTime?: number;
  KillerName?: string;
  VictimName?: string;
  Assisters?: string[];
  TurretKilled?: string;
  InhibKilled?: string;
  DragonType?: string;
  Stolen?: string;
}

export interface LiveClientAllGameData {
  activePlayer?: {
    summonerName?: string;
    riotId?: string;
    riotIdGameName?: string;
    currentGold?: number;
    level?: number;
  };
  allPlayers?: LiveClientPlayer[];
  events?: { Events?: LiveClientEvent[] };
  gameData?: {
    gameMode?: string;
    gameTime?: number;
    mapName?: string;
    mapNumber?: number;
  };
}

// ============================================================================
// Conversion
// ============================================================================

/** ORDER = blue side (teamId 100), CHAOS = red (teamId 200). */
function teamBucket(team: LiveClientPlayer["team"]): "blue" | "red" {
  return team === "CHAOS" ? "red" : "blue";
}

function characterFromLive(
  championName: string | undefined,
  ddragonVersion: string,
  ddragonById: Map<string, DDragonChampion>,
): Character {
  const id = championName ?? "Unknown";
  const meta = getChampMeta(id);
  const dd = ddragonById.get(id);
  return {
    id,
    name: dd?.name ?? id,
    imageUrl: dd ? championImageUrl(ddragonVersion, dd.image.full) : undefined,
    tags: meta?.tags ?? dd?.tags ?? [],
    damageType: meta?.damageType ?? "unknown",
    archetype: meta?.archetype,
  };
}

/**
 * Resolve the focused player against the player list. Live Client populates
 * `activePlayer.summonerName` with the in-game display name; on newer clients
 * it also includes `riotId` (e.g. "Faker#KR1"). We try both.
 *
 * Falls back to a caller-provided hint (e.g. the route's `name` query param)
 * so the page still works if the active-player names disagree with what the
 * URL was opened with.
 */
function findFocusedPlayer(
  data: LiveClientAllGameData,
  hint?: string,
): LiveClientPlayer | null {
  const players = data.allPlayers ?? [];
  if (players.length === 0) return null;

  const candidates: string[] = [];
  if (data.activePlayer?.riotId) candidates.push(data.activePlayer.riotId);
  if (data.activePlayer?.riotIdGameName) candidates.push(data.activePlayer.riotIdGameName);
  if (data.activePlayer?.summonerName) candidates.push(data.activePlayer.summonerName);
  if (hint) candidates.push(hint);

  for (const c of candidates) {
    const lower = c.toLowerCase();
    const match = players.find(
      (p) =>
        p.summonerName?.toLowerCase() === lower ||
        p.riotId?.toLowerCase() === lower ||
        p.riotIdGameName?.toLowerCase() === lower,
    );
    if (match) return match;
  }
  return null;
}

/** Build a name → team map, keyed by every form Riot ever uses for a player. */
function indexPlayersByName(players: LiveClientPlayer[]): Map<string, "blue" | "red"> {
  const map = new Map<string, "blue" | "red">();
  for (const p of players) {
    const team = teamBucket(p.team);
    if (p.summonerName) map.set(p.summonerName.toLowerCase(), team);
    if (p.riotId) map.set(p.riotId.toLowerCase(), team);
    if (p.riotIdGameName) map.set(p.riotIdGameName.toLowerCase(), team);
  }
  return map;
}

/** Owning team encoded in the turret/inhibitor ID — e.g. "Turret_T1_C_03_A" or "Barracks_T2_L1". */
function structureOwner(structureId: string | undefined): "blue" | "red" | null {
  if (!structureId) return null;
  if (structureId.includes("_T1_")) return "blue";
  if (structureId.includes("_T2_")) return "red";
  return null;
}

/**
 * Aggregate the events log into per-team objective totals.
 *
 * For champion / dragon / herald / baron kills the killer's team gets credit.
 * For turrets and inhibitors the *opposite* team of the structure's owner
 * gets credit (you destroy the enemy's tower, not your own).
 *
 * Unknown attributions are silently dropped — the alternative is double
 * counting or attributing minion executions to a team, which is worse.
 */
function aggregateScores(
  events: LiveClientEvent[],
  playerTeamByName: Map<string, "blue" | "red">,
): { blue: TeamScore; red: TeamScore } {
  const blue: TeamScore = { kills: 0, towers: 0, drakes: 0, heralds: 0, barons: 0, inhibitors: 0 };
  const red: TeamScore = { kills: 0, towers: 0, drakes: 0, heralds: 0, barons: 0, inhibitors: 0 };

  const teamOf = (name: string | undefined): "blue" | "red" | null => {
    if (!name) return null;
    return playerTeamByName.get(name.toLowerCase()) ?? null;
  };
  const credit = (team: "blue" | "red" | null, key: keyof TeamScore) => {
    if (team === "blue") blue[key]++;
    else if (team === "red") red[key]++;
  };

  for (const ev of events) {
    switch (ev.EventName) {
      case "ChampionKill":
        credit(teamOf(ev.KillerName), "kills");
        break;
      case "TurretKilled": {
        const owner = structureOwner(ev.TurretKilled);
        if (owner) credit(owner === "blue" ? "red" : "blue", "towers");
        break;
      }
      case "InhibKilled": {
        const owner = structureOwner(ev.InhibKilled);
        if (owner) credit(owner === "blue" ? "red" : "blue", "inhibitors");
        break;
      }
      case "DragonKill":
        credit(teamOf(ev.KillerName), "drakes");
        break;
      case "HeraldKill":
        credit(teamOf(ev.KillerName), "heralds");
        break;
      case "BaronKill":
        credit(teamOf(ev.KillerName), "barons");
        break;
      default:
        // Ignore GameStart, MinionsSpawning, FirstBlood (already covered by ChampionKill), Multikill, etc.
        break;
    }
  }
  return { blue, red };
}

/**
 * Convert a Live Client `allgamedata` body into a `Match`. Returns null if
 * the body looks unusable (no players, or we can't pin a focused player) so
 * the caller can fall back to the Spectator/Match-v5 path without crashing.
 *
 * @param payload raw body the Companion forwarded from 127.0.0.1:2999
 * @param opts.matchId stable key for React lists (game id from gameData has no
 *   matchId yet — we synthesise one from start time + gameMode so it stays
 *   stable across SSE frames)
 * @param opts.focusedPlayerName fallback for `findFocusedPlayer` when
 *   `activePlayer` is missing (rare but happens on the very first frame)
 */
export async function liveClientToMatch(
  payload: unknown,
  opts: { matchId?: string; focusedPlayerName?: string } = {},
): Promise<Match | null> {
  if (!payload || typeof payload !== "object") return null;
  const data = payload as LiveClientAllGameData;
  const players = data.allPlayers ?? [];
  if (players.length === 0) return null;

  const focused = findFocusedPlayer(data, opts.focusedPlayerName);
  // We *can* still render a match with no clearly focused player by defaulting
  // to ORDER side, but ally/enemy orientation is the whole point of this app —
  // refuse the frame so the page keeps polling Spectator instead.
  if (!focused) return null;

  const focusedTeam = teamBucket(focused.team);

  const { version: ddVersion, champs } = await getAllChampions();
  const ddById = new Map(champs.map((c) => [c.id, c]));

  const participants: Participant[] = players.map((p) => {
    const team = teamBucket(p.team);
    const side: Side = team === focusedTeam ? "ally" : "enemy";
    const character = characterFromLive(p.championName, ddVersion, ddById);

    const spell1 = p.summonerSpells?.summonerSpellOne?.displayName;
    const spell2 = p.summonerSpells?.summonerSpellTwo?.displayName;
    const rawSpell1 = p.summonerSpells?.summonerSpellOne?.rawDisplayName;
    const rawSpell2 = p.summonerSpells?.summonerSpellTwo?.rawDisplayName;

    return {
      side,
      team,
      position: p.position ? p.position : undefined,
      character,
      summonerSpells: [
        spell1 ?? rawSpell1 ?? "Unknown",
        spell2 ?? rawSpell2 ?? "Unknown",
      ],
      runes: p.runes
        ? {
            primary:
              p.runes.primaryRuneTree?.displayName ??
              (p.runes.primaryRuneTree?.id !== undefined ? String(p.runes.primaryRuneTree.id) : ""),
            secondary:
              p.runes.secondaryRuneTree?.displayName ??
              (p.runes.secondaryRuneTree?.id !== undefined ? String(p.runes.secondaryRuneTree.id) : ""),
          }
        : undefined,
      stats: p.scores
        ? {
            kills: p.scores.kills,
            deaths: p.scores.deaths,
            assists: p.scores.assists,
            cs: p.scores.creepScore,
            // Live Client doesn't expose per-player gold for enemies (only the
            // active player's currentGold). The recommender tolerates 0.
            gold: 0,
            level: p.level ?? 1,
          }
        : undefined,
    } satisfies Participant;
  });

  const ally = participants.filter((p) => p.side === "ally");
  const enemy = participants.filter((p) => p.side === "enemy");

  const events = data.events?.Events ?? [];
  const playerTeamByName = indexPlayersByName(players);
  const teamScores = aggregateScores(events, playerTeamByName);
  const allyScore = focusedTeam === "blue" ? teamScores.blue : teamScores.red;
  const enemyScore = focusedTeam === "blue" ? teamScores.red : teamScores.blue;

  const gameTimeSeconds = data.gameData?.gameTime ?? 0;
  // No real matchId from Live Client. Use a stable synthetic so React keys
  // don't churn on every SSE frame, and downstream caches can dedupe.
  const synthMatchId =
    opts.matchId ??
    `lc-${data.gameData?.gameMode ?? "GAME"}-${data.gameData?.mapNumber ?? "?"}-${Math.floor((Date.now() - gameTimeSeconds * 1000) / 1000)}`;

  // Avoid noisy lint about an unused helper while still exporting types
  void SUMMONER_SPELLS;

  return {
    gameId: "league",
    matchId: synthMatchId,
    mode: data.gameData?.gameMode,
    durationSeconds: gameTimeSeconds,
    teams: [{ participants: ally }, { participants: enemy }],
    liveStats: {
      gameTimeSeconds,
      source: "live-client",
      scores: { ally: allyScore, enemy: enemyScore },
    },
    meta: { raw: data },
  };
}
