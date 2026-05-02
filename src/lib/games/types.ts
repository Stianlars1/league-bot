/**
 * Normalized cross-game match envelope. Every adapter (Riot/Stratz/...) maps
 * its native shape into this so UI and recommenders can be game-agnostic at
 * the shell level. Game-specific recommender code reads `meta.raw` for fields
 * outside the normalized fields.
 */

export type GameId = "league" | "dota";

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
  /** Optional: target a specific ally so UI can pin it under that player */
  forAllyPosition?: string;
}
