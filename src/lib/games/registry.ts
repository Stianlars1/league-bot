import type { GameAdapter } from "./adapter";
import { leagueAdapter } from "./league/adapter";
import { dotaAdapter } from "./dota/adapter";
import type { GameId } from "./types";

const adapters: Record<GameId, GameAdapter> = {
  league: leagueAdapter,
  dota: dotaAdapter,
};

export function getAdapter(gameId: GameId): GameAdapter {
  const adapter = adapters[gameId];
  if (!adapter) throw new Error(`Unknown gameId: ${gameId}`);
  return adapter;
}

export function getAllAdapters(): GameAdapter[] {
  return Object.values(adapters);
}

export function isGameId(value: string): value is GameId {
  return value === "league" || value === "dota";
}
