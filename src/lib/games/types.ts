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
  items?: string[]; // Dota
}

export interface Match {
  gameId: GameId;
  matchId: string;
  mode?: string; // "CLASSIC", "ARAM", "TURBO", ...
  startedAt?: number; // unix ms
  durationSeconds?: number;
  /** index 0 = ally team relative to focused player; 1 = enemy team */
  teams: [{ participants: Participant[] }, { participants: Participant[] }];
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
