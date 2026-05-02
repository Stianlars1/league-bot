import type { GameAdapter } from "./adapter";
import { dotaAdapter } from "./dota/adapter";
import { dotaIcons } from "./dota/icons";
import { leagueAdapter } from "./league/adapter";
import { leagueIcons } from "./league/icons";
import type { GameIcons } from "./icons";
import type { GameId } from "./types";

const adapters: Record<GameId, GameAdapter> = {
  league: leagueAdapter,
  dota: dotaAdapter,
};

const icons: Record<GameId, GameIcons> = {
  league: leagueIcons,
  dota: dotaIcons,
};

export function getIcons(gameId: GameId): GameIcons {
  return icons[gameId];
}

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
