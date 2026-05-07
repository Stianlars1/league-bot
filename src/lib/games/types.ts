/**
 * Normalized cross-game match envelope. Every adapter (Riot/Stratz/...) maps
 * its native shape into this so UI and recommenders can be game-agnostic at
 * the shell level. Game-specific recommender code reads `meta.raw` for fields
 * outside the normalized fields.
 */

export type GameId = "league" | "dota";

/** Bundled output of a match analysis — recommendations, ally plan, top-line plan */
export interface MatchAnalysis {
  recommendations: Recommendation[];
  allyActions: AllyAction[];
  plan: MatchPlan;
}

/** Lightweight thumbnail of a finished match for history list */
export interface MatchSummary {
  matchId: string;
  championId: string;
  championName: string;
  championImageUrl?: string;
  win: boolean;
  kda: { kills: number; deaths: number; assists: number };
  cs: number;
  durationSeconds: number;
  endedMsAgo: number;
  mode?: string;
  position?: string;
}

/** Calculated intelligence layer on top of a Match */
export interface WinProbability {
  ally: number; // 0..100
  enemy: number; // 0..100
  /** Top 3 reasons sorted by absolute impact, ally-positive first */
  drivers: { label: string; deltaPct: number }[];
}

export interface ObjectiveTimer {
  kind: "drake" | "herald" | "baron" | "elder";
  status: "available" | "cooldown" | "gone";
  /** Seconds until next spawn from now. Negative if available already. */
  inSeconds: number;
  /** Human-friendly label like "Cloud drake (estimated)" */
  detail?: string;
}

export interface PowerSpike {
  championId: string;
  championName: string;
  side: "ally" | "enemy";
  position?: string;
  description: string; // "2-item spike (Stormrazor + RFC)"
  /** Seconds from now until spike. Negative if already past. */
  inSeconds: number;
  importance: "low" | "medium" | "high";
}

export interface LaneMatchup {
  position: string;
  ally: { championId: string; championName: string; imageUrl?: string; stats?: ParticipantStats };
  enemy: { championId: string; championName: string; imageUrl?: string; stats?: ParticipantStats };
  /** -100..100, positive = ally winning the lane */
  laneScore: number;
  goldDelta: number;
  csDelta: number;
  kdaDelta: number;
  summary: string;
}

export interface MacroCall {
  headline: string;
  body: string;
  urgency: "high" | "medium" | "low";
  tag: "group" | "siege" | "back" | "objective" | "splitpush" | "stall";
  inSeconds?: number;
}

export interface MatchIntel {
  winProbability: WinProbability;
  objectives: ObjectiveTimer[];
  powerSpikes: PowerSpike[];
  laneMatchups: LaneMatchup[];
  macroCall: MacroCall | null;
}

export type Side = "ally" | "enemy" | "blue" | "red" | "radiant" | "dire";

export type DamageType = "ad" | "ap" | "hybrid" | "physical" | "magical" | "pure" | "unknown";

export interface Character {
  id: string; // game-stable identifier ("Aatrox", "antimage", numeric in some games)
  name: string;
  imageUrl?: string;
  tags?: string[];
  damageType?: DamageType;
  archetype?: string; // "assassin" | "tank" | "carry" | "support" | ...
}

export interface Participant {
  side: Side; // resolved against the focused player so UI can show ally/enemy
  team: "blue" | "red" | "radiant" | "dire";
  position?: string; // "TOP" | "JUNGLE" | ... | "POS_1" | ...
  character: Character;
  summonerSpells?: string[]; // League: e.g. ["Flash", "Teleport"]
  runes?: { primary?: string; secondary?: string };
  /** Inventory item identifiers. League: item-numeric-ID-as-string. Dota: item slugs. */
  items?: string[];
  /** Pre-resolved icon URLs for the items above, in the same order. */
  itemImageUrls?: string[];
  stats?: ParticipantStats;
}

export interface ParticipantStats {
  kills: number;
  deaths: number;
  assists: number;
  cs: number;
  gold: number;
  level: number;
}

export interface TeamScore {
  kills: number;
  towers: number;
  drakes: number;
  heralds: number;
  barons: number;
  inhibitors: number;
}

/**
 * Live runtime stats. Available only when an upstream API supplies them
 * (mock mode, or Live Client Data when the focused user is the player).
 * Riot Spectator-v5 does NOT include any of this — the field is omitted
 * for real Spectator-v5 fetches and the UI degrades gracefully.
 */
export interface LiveStats {
  /** Tracked locally with a ticking timer between polls so it stays accurate. */
  gameTimeSeconds: number;
  /** Whether scores/KDA come from a real source or mock — UI shows a flag */
  source: "mock" | "live-client" | "spectator-only" | "post-game";
  /** For post-game: ms since match ended, so UI can show "3 min ago" */
  endedMsAgo?: number;
  scores: { ally: TeamScore; enemy: TeamScore };
}

export interface Match {
  gameId: GameId;
  matchId: string;
  mode?: string; // "CLASSIC", "ARAM", "TURBO", ...
  startedAt?: number; // unix ms
  durationSeconds?: number;
  /** index 0 = ally team relative to focused player; 1 = enemy team */
  teams: [{ participants: Participant[] }, { participants: Participant[] }];
  /** Optional live runtime data (KDA, scores, objectives, gold, levels) */
  liveStats?: LiveStats;
  meta?: { raw?: unknown };
}

export interface Player {
  gameId: GameId;
  externalId: string; // PUUID for Riot, account_id for Steam
  displayName: string;
  region?: string;
}

export type Severity = "critical" | "high" | "medium" | "low";

export type RecommendationCategory =
  | "defensive-item"
  | "offensive-item"
  | "utility-item"
  | "strategy"
  | "objective"
  | "lane-matchup";

/**
 * Provenance for a recommendation. Layers correspond to the tiered
 * recommender engine (see docs/plans/recommender-tiered-engine.md):
 *   1 — rule-based, anchored to live state via item-tags
 *   2 — curated counter-graph + per-champion paths (cited)
 *   3 — empirical aggregates from Match-V5 (sample size + win rate)
 */
export type RecommendationSource =
  | { layer: 1; ruleId: string }
  | { layer: 2; ruleId: string; cite: string }
  | { layer: 3; sampleSize: number; winRate: number; patch: string };

/**
 * Semantic threat types the curated counter-graph maps to counter items.
 * Distinguished by mechanic (burst vs DoT) not just damage type, because
 * counter items differ — Maw's lifeline shield is great vs burst, weaker
 * vs sustained DoT; Force of Nature scales with magic damage taken so it's
 * stronger vs DoT than vs burst.
 */
export type ThreatType =
  | "AP-burst"
  | "AP-DoT"
  | "AP-sustained"
  | "AD-burst"
  | "AD-sustained"
  | "AD-attackspeed"
  | "Tank"
  | "Healing"
  | "Shielding"
  | "CC-chain"
  | "Engage"
  | "Poke"
  | "Roam";

/**
 * One ordered step in a curated build path. Layer 2 emits these per ally
 * based on enemy threat types. Layer 3 will replace `confidence: "curated"`
 * with `confidence: "empirical"` when win-rate data backs the choice.
 */
export interface BuildStep {
  itemId: string;            // Riot item ID (numeric string from Data Dragon)
  itemName: string;          // "Mortal Reminder"
  itemImageUrl?: string;
  reason: string;            // why this item, for THIS ally vs THIS enemy state
  cost: number;              // total gold cost from Data Dragon
  /** Sub-components the ally already owns (saves the player gold). */
  componentsOwned?: string[];
  confidence: "rule" | "curated" | "empirical";
  /** Citation tying this recommendation to a documented mechanic / source. */
  cite?: string;
}

export interface Recommendation {
  id: string; // stable key for React lists, ideally "<category>:<rule-id>"
  category: RecommendationCategory;
  severity: Severity;
  title: string;
  body: string;
  rationale?: string; // short "because enemy has X, Y" trail
  /** Items to surface as visual chips in the UI */
  keyItems?: string[];
  /** Which ally archetypes this advice applies to */
  forArchetypes?: string[];
  /** Optional: target a specific ally so UI can pin it under that player */
  forAllyPosition?: string;
  /** Which layer of the recommender engine produced this (when known). */
  source?: RecommendationSource;
  /** When multiple layers produced an answer for the same slot, the
   *  lower-confidence ones are listed here so the UI can show fallbacks. */
  alsoFrom?: RecommendationSource[];
}

/**
 * Per-ally action plan — what THIS specific player on the team should
 * build, in priority order, against THIS enemy lineup. The UI rendering
 * surface most players actually scan during a match.
 */
export interface AllyAction {
  championId: string;
  championName: string;
  position?: string;
  archetype?: string;
  damageType?: DamageType;
  imageUrl?: string;
  /** Single highest-priority item with one-line reason */
  priority: { item: string; reason: string };
  /** 1–3 follow-up items in build order */
  followUps: string[];
  /** The single most dangerous enemy for this ally */
  watchOut?: { championId: string; championName: string; reason: string };
  /** Which layer produced this advice (see RecommendationSource). */
  source?: RecommendationSource;
  /** Layer 2+: ordered next-buy queue with per-step rationale + citation.
   *  Empty when the ally champion has no curated entry — falls back to
   *  the layer-1 `priority` + `followUps` pair. */
  buildPath?: BuildStep[];
}

/** Top-level "how do we beat this comp" — one paragraph, 1-2 actions */
export interface MatchPlan {
  /** Short label for the enemy's overall identity, e.g. "AP healers + tank engage" */
  enemyArchetype: string;
  /** One sentence: how to win against this comp */
  counterStrategy: string;
  /** Up to 3 highest-impact actions, in priority order */
  topActions: { title: string; detail: string }[];
}
