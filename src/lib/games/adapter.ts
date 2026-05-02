import type {
  AllyAction,
  Character,
  GameId,
  Match,
  MatchIntel,
  MatchPlan,
  MatchSummary,
  Player,
  Recommendation,
} from "./types";

export interface Recommender {
  recommend(match: Match): Recommendation[];
  /** Per-ally specific build advice. Optional — falls back to empty array. */
  allyActions?(match: Match): AllyAction[];
  /** Top-level "how do we beat this comp" plan. Optional. */
  plan?(match: Match): MatchPlan;
  /** Match-state intel: win prob, objectives, power spikes, lane matchups. */
  intel?(match: Match): MatchIntel | null;
}

export interface GameAdapter {
  readonly gameId: GameId;
  readonly displayName: string;
  /** Hint shown in the input field on the landing page */
  readonly playerInputHint: string;
  /** Short rules-of-engagement note shown under the input (e.g. Riot 3-min delay) */
  readonly liveDataCaveat?: string;

  /** Resolve a free-form user input into a stable external player ID. */
  findPlayer(query: string): Promise<Player>;

  /**
   * Returns the player's currently active match, or null if they aren't in one.
   * Implementations should NOT throw on "not in match" — only on real errors.
   */
  getActiveMatch(player: Player): Promise<Match | null>;

  /**
   * Returns the player's most recently completed match (post-game).
   * Used as a fallback when getActiveMatch returns null so we can still
   * surface meaningful analysis. Optional — return null if not supported.
   */
  getLastFinishedMatch?(player: Player): Promise<Match | null>;

  /**
   * Returns lightweight summaries of the player's most recent finished
   * matches for the history strip. Optional.
   */
  getRecentMatches?(player: Player, limit?: number): Promise<MatchSummary[]>;

  /** Static character catalog used to seed the DB. Called by the cron job. */
  getCharacterCatalog(): Promise<Character[]>;

  /** Game-specific recommendation engine. */
  readonly recommender: Recommender;
}
