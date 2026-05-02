"use client";

import useSWR from "swr";

import type { GameId, Match, Recommendation } from "@/lib/games/types";

export interface LivePayload {
  match: Match | null;
  recommendations: Recommendation[];
  fetchedAt: number;
  error?: string;
}

const fetcher = async (url: string): Promise<LivePayload> => {
  const res = await fetch(url);
  const json = (await res.json()) as LivePayload | { error: string };
  if ("error" in json && !("match" in json)) {
    return { match: null, recommendations: [], fetchedAt: Date.now(), error: json.error };
  }
  return json as LivePayload;
};

export function useLiveMatch(params: {
  game: GameId;
  id: string;
  region?: string;
  name?: string;
  enabled?: boolean;
}) {
  const { game, id, region, name, enabled = true } = params;

  const search = new URLSearchParams({ game, id });
  if (region) search.set("region", region);
  if (name) search.set("name", name);

  const url = `/api/match/live?${search.toString()}`;

  return useSWR<LivePayload>(enabled ? url : null, fetcher, {
    refreshInterval: 15_000,
    revalidateOnFocus: false,
    keepPreviousData: true,
    shouldRetryOnError: false,
  });
}
