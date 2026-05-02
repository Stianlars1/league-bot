import type { Match, MatchIntel } from "../types";

export interface MacroCall {
  /** ALL-CAPS imperative for instant scan ("PRESSURE BARON") */
  headline: string;
  /** One-sentence rationale */
  body: string;
  /** Visual urgency */
  urgency: "high" | "medium" | "low";
  /** Optional countdown to a specific event */
  inSeconds?: number;
  /** Optional tag (group / siege / back / objective / etc.) */
  tag: "group" | "siege" | "back" | "objective" | "splitpush" | "stall";
}

/**
 * Decide the single most-impactful tactical call for the team right now.
 * Reads intel + raw match state and emits one call (or null if nothing
 * decisive is happening).
 */
export function computeMacroCall(match: Match, intel: MatchIntel | null): MacroCall | null {
  if (!intel) return null;

  const ally = intel.winProbability.ally;
  const enemy = intel.winProbability.enemy;
  const baron = intel.objectives.find((o) => o.kind === "baron");
  const drake = intel.objectives.find((o) => o.kind === "drake" || o.kind === "elder");
  const herald = intel.objectives.find((o) => o.kind === "herald");

  const ls = match.liveStats;
  const allyKills = ls?.scores.ally.kills ?? 0;
  const enemyKills = ls?.scores.enemy.kills ?? 0;
  const killDelta = allyKills - enemyKills;
  const drakeDelta = (ls?.scores.ally.drakes ?? 0) - (ls?.scores.enemy.drakes ?? 0);

  // BARON IS UP and we're winning teamfights → group + take
  if (baron?.status === "available" && ally >= 55) {
    return {
      headline: "GROUP BARON NOW",
      body: `Baron's up and you're +${killDelta} on kills. Smoke + take, then siege as a 5.`,
      urgency: "high",
      tag: "objective",
      inSeconds: 0,
    };
  }

  // BARON SOON (< 90s) and we have priority
  if (baron && baron.inSeconds > 0 && baron.inSeconds <= 90 && ally >= 50) {
    return {
      headline: "STAGE BARON",
      body: `Baron in ${formatSec(baron.inSeconds)}. Clear vision, group bot side, force the play.`,
      urgency: "medium",
      tag: "objective",
      inSeconds: baron.inSeconds,
    };
  }

  // DRAKE/ELDER SOUL/dragon close and we need it
  if (drake && drake.status === "available" && drakeDelta < 0) {
    return {
      headline: "CONTEST DRAGON",
      body: `Drake's up and you're behind on stacks. Group with vision — they need this more than you.`,
      urgency: "high",
      tag: "objective",
      inSeconds: 0,
    };
  }
  if (drake && drake.inSeconds > 0 && drake.inSeconds <= 60) {
    return {
      headline: drake.kind === "elder" ? "ELDER WINDOW" : "DRAGON IN " + formatSec(drake.inSeconds),
      body: drake.kind === "elder"
        ? "Elder buff swings any teamfight. Stack vision in pit 30s before."
        : "Push waves out, then collapse. Don't 4v5 contest.",
      urgency: drake.kind === "elder" ? "high" : "medium",
      tag: "objective",
      inSeconds: drake.inSeconds,
    };
  }

  // HERALD is up — early-mid pressure
  if (herald?.status === "available" && (match.durationSeconds ?? 0) < 14 * 60) {
    return {
      headline: "TAKE HERALD",
      body: "Herald's active and you have 6 min before despawn. Burn it on top tower for the plate gold.",
      urgency: "medium",
      tag: "objective",
      inSeconds: 0,
    };
  }

  // BIG LEAD — siege
  if (ally >= 70) {
    return {
      headline: "SIEGE MID NOW",
      body: `${ally}% win prob. Push waves to inner, collapse with TPs, end before they recover.`,
      urgency: "high",
      tag: "siege",
    };
  }

  // BIG DEFICIT and an enemy power-spike incoming
  const enemySpikeSoon = intel.powerSpikes.find(
    (s) => s.side === "enemy" && s.importance === "high" && s.inSeconds <= 60,
  );
  if (enemy >= 65 && enemySpikeSoon) {
    return {
      headline: "BACK + RESET",
      body: `Their ${enemySpikeSoon.championName} is ${formatSec(enemySpikeSoon.inSeconds)} from ${enemySpikeSoon.description}. Stall, group, defend.`,
      urgency: "high",
      tag: "back",
      inSeconds: enemySpikeSoon.inSeconds,
    };
  }

  if (enemy >= 65) {
    return {
      headline: "STALL FOR LATE",
      body: `${enemy}% against you. Trade objectives for safety. Don't take 5v5 fights without ult cooldowns.`,
      urgency: "medium",
      tag: "stall",
    };
  }

  // Splitpush opportunity if your top is fed
  const topAlly = match.teams[0].participants.find((p) => p.position === "TOP");
  const topEnemy = match.teams[1].participants.find((p) => p.position === "TOP");
  if (
    topAlly?.stats &&
    topEnemy?.stats &&
    topAlly.stats.gold - topEnemy.stats.gold > 1500 &&
    (match.durationSeconds ?? 0) > 12 * 60
  ) {
    return {
      headline: "SPLIT TOP",
      body: `${topAlly.character.name} is +${((topAlly.stats.gold - topEnemy.stats.gold) / 1000).toFixed(1)}k. Push side wave while team holds mid.`,
      urgency: "medium",
      tag: "splitpush",
    };
  }

  // Even game — generic group call if mid game
  if ((match.durationSeconds ?? 0) > 8 * 60 && Math.abs(ally - 50) < 10) {
    return {
      headline: "GROUP MID",
      body: "Even game. Wait for cooldowns, ward river, win the next neutral fight.",
      urgency: "low",
      tag: "group",
    };
  }

  return null;
}

function formatSec(s: number) {
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}
