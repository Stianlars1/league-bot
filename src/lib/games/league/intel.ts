import type {
  LaneMatchup,
  Match,
  MatchIntel,
  ObjectiveTimer,
  ParticipantStats,
  PowerSpike,
  WinProbability,
} from "../types";
import { getChampMeta, type LeagueChampMeta } from "./data";

/* -------------------- Win probability -------------------- */

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

function sumStats(parts: { stats?: ParticipantStats }[]): { gold: number; kills: number } {
  let gold = 0;
  let kills = 0;
  for (const p of parts) {
    gold += p.stats?.gold ?? 0;
    kills += p.stats?.kills ?? 0;
  }
  return { gold, kills };
}

export function computeWinProbability(match: Match): WinProbability | null {
  const ls = match.liveStats;
  if (!ls || ls.source === "spectator-only") return null;

  const ally = sumStats(match.teams[0].participants);
  const enemy = sumStats(match.teams[1].participants);

  const killDelta = ls.scores.ally.kills - ls.scores.enemy.kills;
  const towerDelta = ls.scores.ally.towers - ls.scores.enemy.towers;
  const drakeDelta = ls.scores.ally.drakes - ls.scores.enemy.drakes;
  const heraldDelta = ls.scores.ally.heralds - ls.scores.enemy.heralds;
  const baronDelta = ls.scores.ally.barons - ls.scores.enemy.barons;
  const inhibDelta = ls.scores.ally.inhibitors - ls.scores.enemy.inhibitors;
  const goldDelta = ally.gold - enemy.gold;

  const drivers = [
    { label: `Gold ${goldDelta >= 0 ? "+" : ""}${(goldDelta / 1000).toFixed(1)}k`, deltaPct: (goldDelta / 1000) * 1.6 },
    { label: `Kills ${killDelta >= 0 ? "+" : ""}${killDelta}`, deltaPct: killDelta * 1.4 },
    { label: `Towers ${towerDelta >= 0 ? "+" : ""}${towerDelta}`, deltaPct: towerDelta * 4.0 },
    { label: `Drakes ${drakeDelta >= 0 ? "+" : ""}${drakeDelta}`, deltaPct: drakeDelta * 3.0 },
    { label: heraldDelta !== 0 ? `Herald ${heraldDelta >= 0 ? "+" : ""}${heraldDelta}` : "", deltaPct: heraldDelta * 2.0 },
    { label: baronDelta !== 0 ? `Baron ${baronDelta >= 0 ? "+" : ""}${baronDelta}` : "", deltaPct: baronDelta * 8.0 },
    { label: inhibDelta !== 0 ? `Inhib ${inhibDelta >= 0 ? "+" : ""}${inhibDelta}` : "", deltaPct: inhibDelta * 6.0 },
  ].filter((d) => d.label !== "");

  const totalDelta = drivers.reduce((acc, d) => acc + d.deltaPct, 0);
  const ally50 = clamp(50 + totalDelta, 5, 95);
  const enemy50 = 100 - ally50;

  const sortedDrivers = drivers
    .filter((d) => Math.abs(d.deltaPct) >= 0.5)
    .sort((a, b) => Math.abs(b.deltaPct) - Math.abs(a.deltaPct))
    .slice(0, 3);

  return {
    ally: Math.round(ally50),
    enemy: Math.round(enemy50),
    drivers: sortedDrivers,
  };
}

/* -------------------- Objective timers -------------------- */

export function computeObjectives(match: Match): ObjectiveTimer[] {
  const ls = match.liveStats;
  const t = match.durationSeconds ?? ls?.gameTimeSeconds ?? 0;
  const drakesKilled = (ls?.scores.ally.drakes ?? 0) + (ls?.scores.enemy.drakes ?? 0);
  const heraldsKilled = (ls?.scores.ally.heralds ?? 0) + (ls?.scores.enemy.heralds ?? 0);
  const baronsKilled = (ls?.scores.ally.barons ?? 0) + (ls?.scores.enemy.barons ?? 0);

  const out: ObjectiveTimer[] = [];

  // Drake — first at 5:00, then 5min after each kill (estimate).
  // We don't know when drake was killed exactly; assume evenly spaced.
  if (t < 35 * 60) {
    const expectedNext = drakesKilled === 0 ? 5 * 60 : Math.max(t + 60, drakesKilled * 5 * 60 + 5 * 60);
    const inSec = expectedNext - t;
    out.push({
      kind: drakesKilled >= 4 ? "elder" : "drake",
      status: inSec <= 0 ? "available" : "cooldown",
      inSeconds: inSec,
      detail: drakesKilled >= 4 ? "Elder drake window" : `${ordinal(drakesKilled + 1)} drake`,
    });
  }

  // Herald — spawns at 8:00 (was 6:00 historically), despawns at 14:00.
  if (heraldsKilled === 0) {
    if (t < 8 * 60) {
      out.push({ kind: "herald", status: "cooldown", inSeconds: 8 * 60 - t, detail: "Herald spawn" });
    } else if (t < 14 * 60) {
      out.push({ kind: "herald", status: "available", inSeconds: 0, detail: "Herald active — 6 min window" });
    }
  } else if (t < 14 * 60) {
    out.push({ kind: "herald", status: "gone", inSeconds: 0, detail: "Already taken" });
  }

  // Baron — spawns at 25:00 (current LoL). After kill, respawns 6 min later.
  if (t < 25 * 60) {
    out.push({ kind: "baron", status: "cooldown", inSeconds: 25 * 60 - t, detail: "Baron spawn" });
  } else {
    const sinceLast = baronsKilled === 0 ? 0 : 6 * 60;
    const nextAt = baronsKilled === 0 ? 25 * 60 : 25 * 60 + baronsKilled * (sinceLast + 60);
    const inSec = Math.max(0, nextAt - t);
    out.push({ kind: "baron", status: inSec <= 0 ? "available" : "cooldown", inSeconds: inSec, detail: "Baron Nashor" });
  }

  return out.slice(0, 3);
}

function ordinal(n: number): string {
  const s = ["th", "st", "nd", "rd"];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

/* -------------------- Power spikes -------------------- */

interface SpikeRule {
  /** Ally picks at certain levels or gold thresholds — whichever hits first */
  level?: number;
  gold?: number;
  description: string;
  importance: PowerSpike["importance"];
}

function spikesForArchetype(meta: LeagueChampMeta | undefined): SpikeRule[] {
  const archetype = meta?.archetype ?? "fighter";
  const rules: SpikeRule[] = [];
  // Ult unlock — almost always significant
  rules.push({ level: 6, description: "Ult unlocked (level 6)", importance: "medium" });

  if (archetype === "marksman") {
    rules.push({ gold: 6800, description: "1-item spike (mythic)", importance: "medium" });
    rules.push({ gold: 11500, description: "2-item spike (zeal item)", importance: "high" });
    rules.push({ gold: 16000, description: "3-item spike (IE / LDR)", importance: "high" });
  } else if (archetype === "mage") {
    rules.push({ gold: 6500, description: "Lost Chapter / Luden's complete", importance: "medium" });
    rules.push({ gold: 11000, description: "2-item spike (Shadowflame / Rabadon's start)", importance: "high" });
    rules.push({ level: 11, description: "R rank 2", importance: "medium" });
  } else if (archetype === "assassin") {
    rules.push({ gold: 6200, description: "1-item spike (Eclipse / Hubris)", importance: "high" });
    rules.push({ gold: 10500, description: "2-item spike (Edge of Night / Serylda)", importance: "high" });
    rules.push({ level: 11, description: "R rank 2 — kills become inevitable", importance: "high" });
  } else if (archetype === "tank") {
    rules.push({ gold: 6000, description: "1-item spike (Sunfire / Heartsteel)", importance: "medium" });
    rules.push({ gold: 10000, description: "2-item spike — tank stat threshold", importance: "medium" });
  } else if (archetype === "support") {
    rules.push({ gold: 4500, description: "Mikael's / Locket complete", importance: "medium" });
    rules.push({ level: 11, description: "R rank 2", importance: "medium" });
  } else if (archetype === "skirmisher" || archetype === "fighter" || archetype === "juggernaut") {
    rules.push({ gold: 6500, description: "1-item spike (mythic)", importance: "medium" });
    rules.push({ gold: 11000, description: "2-item spike (Sterak's / Death's Dance)", importance: "high" });
    rules.push({ level: 11, description: "R rank 2", importance: "medium" });
  }

  // Famous specific spikes
  if (meta?.id === "Veigar") {
    rules.push({ level: 9, description: "Phenomenal Evil stacks online", importance: "high" });
  }
  if (meta?.id === "Kassadin") {
    rules.push({ level: 16, description: "R rank 3 — short cooldown", importance: "high" });
  }
  if (meta?.id === "Yasuo" || meta?.id === "Yone") {
    rules.push({ gold: 7500, description: "Crit IE → AS combo unlocked", importance: "high" });
  }
  if (meta?.id === "Vayne") {
    rules.push({ gold: 9000, description: "BotRK + zeal — DPS goes vertical", importance: "high" });
  }
  if (meta?.id === "MasterYi") {
    rules.push({ level: 11, description: "R rank 2 + 2 items — cleanup mode", importance: "high" });
  }

  return rules;
}

/** Estimated minutes until a given gold/level threshold from current state */
function projectTimeTo(current: number, target: number, ratePerMin: number): number {
  if (target <= current) return 0;
  return ((target - current) / ratePerMin) * 60;
}

const GOLD_PER_MIN_BY_ROLE: Record<string, number> = {
  TOP: 360,
  JUNGLE: 350,
  MIDDLE: 380,
  BOTTOM: 410,
  UTILITY: 280,
};

const XP_LEVELS_PER_MIN_BY_ROLE: Record<string, number> = {
  TOP: 0.7,
  JUNGLE: 0.62,
  MIDDLE: 0.7,
  BOTTOM: 0.7,
  UTILITY: 0.5,
};

export function computePowerSpikes(match: Match): PowerSpike[] {
  const out: PowerSpike[] = [];
  const all = [
    ...match.teams[0].participants.map((p) => ({ ...p, side: "ally" as const })),
    ...match.teams[1].participants.map((p) => ({ ...p, side: "enemy" as const })),
  ];

  for (const part of all) {
    const meta = getChampMeta(part.character.id);
    const rules = spikesForArchetype(meta);
    const stats = part.stats;
    if (!stats) continue;

    const role = part.position ?? "TOP";
    const gpm = GOLD_PER_MIN_BY_ROLE[role] ?? 350;
    const xpr = XP_LEVELS_PER_MIN_BY_ROLE[role] ?? 0.65;

    for (const rule of rules) {
      let inSec: number;
      if (rule.level !== undefined) {
        if (stats.level >= rule.level) inSec = -60; // already past — skip
        else inSec = ((rule.level - stats.level) / xpr) * 60;
      } else if (rule.gold !== undefined) {
        if (stats.gold >= rule.gold) inSec = -60;
        else inSec = projectTimeTo(stats.gold, rule.gold, gpm);
      } else continue;

      if (inSec < 0) continue;
      if (inSec > 8 * 60) continue; // only the next 8 minutes

      out.push({
        championId: part.character.id,
        championName: part.character.name,
        side: part.side,
        position: part.position,
        description: rule.description,
        inSeconds: Math.round(inSec),
        importance: rule.importance,
      });
    }
  }

  // Sort: closest in time first, then importance
  const importanceRank = { high: 0, medium: 1, low: 2 } as const;
  out.sort((a, b) => {
    if (Math.abs(a.inSeconds - b.inSeconds) > 30) return a.inSeconds - b.inSeconds;
    return importanceRank[a.importance] - importanceRank[b.importance];
  });

  return out.slice(0, 6);
}

/* -------------------- Lane matchups -------------------- */

const LANE_ORDER = ["TOP", "JUNGLE", "MIDDLE", "BOTTOM", "UTILITY"];

export function computeLaneMatchups(match: Match): LaneMatchup[] {
  const ally = match.teams[0].participants;
  const enemy = match.teams[1].participants;

  // Group by position; if missing position, fall back to index
  const byPositionAlly = new Map<string, typeof ally[number]>();
  const byPositionEnemy = new Map<string, typeof enemy[number]>();

  ally.forEach((p, i) => byPositionAlly.set(p.position ?? `IDX_${i}`, p));
  enemy.forEach((p, i) => byPositionEnemy.set(p.position ?? `IDX_${i}`, p));

  const out: LaneMatchup[] = [];
  for (const lane of LANE_ORDER) {
    const a = byPositionAlly.get(lane);
    const e = byPositionEnemy.get(lane);
    if (!a || !e) continue;

    const aGold = a.stats?.gold ?? 0;
    const eGold = e.stats?.gold ?? 0;
    const aCs = a.stats?.cs ?? 0;
    const eCs = e.stats?.cs ?? 0;
    const aKda = a.stats ? a.stats.kills + a.stats.assists * 0.5 - a.stats.deaths : 0;
    const eKda = e.stats ? e.stats.kills + e.stats.assists * 0.5 - e.stats.deaths : 0;

    const goldDelta = aGold - eGold;
    const csDelta = aCs - eCs;
    const kdaDelta = aKda - eKda;

    const score = clamp(goldDelta / 50 + csDelta * 1.2 + kdaDelta * 8, -100, 100);

    let summary: string;
    if (Math.abs(score) < 6) summary = "Even — small edges either way";
    else if (score > 0) {
      const parts = [
        goldDelta > 200 ? `+${(goldDelta / 1000).toFixed(1)}k gold` : null,
        csDelta > 5 ? `+${csDelta} cs` : null,
        kdaDelta > 1 ? "kda lead" : null,
      ].filter(Boolean);
      summary = `Ally winning · ${parts.join(", ") || "marginal lead"}`;
    } else {
      const parts = [
        goldDelta < -200 ? `-${(Math.abs(goldDelta) / 1000).toFixed(1)}k gold` : null,
        csDelta < -5 ? `${csDelta} cs` : null,
        kdaDelta < -1 ? "kda behind" : null,
      ].filter(Boolean);
      summary = `Enemy winning · ${parts.join(", ") || "marginal deficit"}`;
    }

    out.push({
      position: lane,
      ally: {
        championId: a.character.id,
        championName: a.character.name,
        imageUrl: a.character.imageUrl,
        stats: a.stats,
      },
      enemy: {
        championId: e.character.id,
        championName: e.character.name,
        imageUrl: e.character.imageUrl,
        stats: e.stats,
      },
      laneScore: Math.round(score),
      goldDelta,
      csDelta,
      kdaDelta: Math.round(kdaDelta * 10) / 10,
      summary,
    });
  }

  return out;
}

/* -------------------- Bundle -------------------- */

import { computeMacroCall } from "./macro";

export function computeMatchIntel(match: Match): MatchIntel | null {
  const winProbability = computeWinProbability(match);
  if (!winProbability) return null;
  const partial = {
    winProbability,
    objectives: computeObjectives(match),
    powerSpikes: computePowerSpikes(match),
    laneMatchups: computeLaneMatchups(match),
    macroCall: null,
  };
  partial.macroCall = computeMacroCall(match, partial) as never;
  return partial;
}
