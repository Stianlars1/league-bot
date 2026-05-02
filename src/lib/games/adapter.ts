import type { Character, GameId, Match, Player, Recommendation } from "./types";

export interface Recommender {
  recommend(match: Match): Recommendation[];
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

  /** Static character catalog used to seed the DB. Called by the cron job. */
  getCharacterCatalog(): Promise<Character[]>;

  /** Game-specific recommendation engine. */
  readonly recommender: Recommender;
}
