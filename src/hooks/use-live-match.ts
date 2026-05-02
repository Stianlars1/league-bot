"use client";

import useSWR from "swr";

import type {
  AllyAction,
  GameId,
  Match,
  MatchIntel,
  MatchPlan,
  Recommendation,
} from "@/lib/games/types";

export interface LivePayload {
  match: Match | null;
  recommendations: Recommendation[];
  allyActions: AllyAction[];
  plan: MatchPlan | null;
  intel: MatchIntel | null;
  fetchedAt: number;
  error?: string;
  mock?: {
    scenarioId: string;
    scenarioLabel: string;
    scenarioIndex: number;
    totalScenarios: number;
    nextChangeIn: number;
  };
}

const fetcher = async (url: string): Promise<LivePayload> => {
  const res = await fetch(url);
  const json = (await res.json()) as LivePayload | { error: string };
  if ("error" in json && !("match" in json)) {
    return {
      match: null,
      recommendations: [],
      allyActions: [],
      plan: null,
      intel: null,
      fetchedAt: Date.now(),
      error: json.error,
    };
  }
  return json as LivePayload;
};

export function useLiveMatch(params: {
  game: GameId;
  id: string;
  region?: string;
  name?: string;
  enabled?: boolean;
  mock?: boolean;
}) {
  const { game, id, region, name, enabled = true, mock = false } = params;

  const search = new URLSearchParams({ game, id });
  if (region) search.set("region", region);
  if (name) search.set("name", name);
  if (mock) search.set("mock", "1");

  const url = `/api/match/live?${search.toString()}`;

  // Mock mode polls faster so the rotating scenarios are clearly visible.
  const refreshInterval = mock ? 5_000 : 15_000;

  return useSWR<LivePayload>(enabled ? url : null, fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    keepPreviousData: true,
    shouldRetryOnError: false,
  });
}
