"use client";

import { useEffect, useRef, useState } from "react";
import useSWR from "swr";

import type {
  AllyAction,
  GameId,
  Match,
  MatchIntel,
  MatchPlan,
  MatchSummary,
  Recommendation,
} from "@/lib/games/types";

const COMPANION_TOKEN_KEY = "counter:companion-token";

export interface LivePayload {
  match: Match | null;
  recommendations: Recommendation[];
  allyActions: AllyAction[];
  plan: MatchPlan | null;
  intel: MatchIntel | null;
  recentMatches: MatchSummary[];
  fetchedAt: number;
  error?: string;
  mock?: {
    scenarioId: string;
    scenarioLabel: string;
    scenarioIndex: number;
    totalScenarios: number;
    nextChangeIn: number;
  };
  /** Set true when the payload was sourced from a Companion frame */
  viaCompanion?: boolean;
  /** Companion pairing/frame status, when relevant */
  companion?: {
    paired: boolean;
    hasFrame: boolean;
    source?: "live-client" | "gsi";
    gameId?: "league" | "dota";
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
      recentMatches: [],
      fetchedAt: Date.now(),
      error: json.error,
    };
  }
  return json as LivePayload;
};

function readCompanionToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(COMPANION_TOKEN_KEY);
}

export function useLiveMatch(params: {
  game: GameId;
  id: string;
  region?: string;
  name?: string;
  enabled?: boolean;
  mock?: boolean;
}) {
  const { game, id, region, name, enabled = true, mock = false } = params;

  // ---------------------------------------------------------------------------
  // Spectator / Match-v5 polled path (always on)
  // ---------------------------------------------------------------------------
  const search = new URLSearchParams({ game, id });
  if (region) search.set("region", region);
  if (name) search.set("name", name);
  if (mock) search.set("mock", "1");

  const polledUrl = `/api/match/live?${search.toString()}`;
  // Mock mode polls faster so the rotating scenarios are clearly visible.
  const refreshInterval = mock ? 5_000 : 15_000;

  const polled = useSWR<LivePayload>(enabled ? polledUrl : null, fetcher, {
    refreshInterval,
    revalidateOnFocus: false,
    keepPreviousData: true,
    shouldRetryOnError: false,
  });

  // ---------------------------------------------------------------------------
  // Companion path (active only when a token is in localStorage)
  // ---------------------------------------------------------------------------
  const [companionToken, setCompanionToken] = useState<string | null>(null);

  // Mock mode is for offline UI testing — never let a stored companion token
  // hijack a sample/mock view.
  useEffect(() => {
    if (mock) {
      setCompanionToken(null);
      return;
    }
    setCompanionToken(readCompanionToken());
  }, [mock]);

  // The companion endpoint reads the latest buffered frame on the server, runs
  // it through the converter + recommender, and returns the same LivePayload
  // shape. We refetch it eagerly whenever the SSE pings with a new frame.
  // The League page is the only consumer for now; Dota lights up in Phase 1.
  const companionEnabled = enabled && !mock && !!companionToken && game === "league";
  const companionUrl = companionToken
    ? `/api/match/from-companion?token=${encodeURIComponent(companionToken)}${name ? `&name=${encodeURIComponent(name)}` : ""}`
    : null;

  const companion = useSWR<LivePayload>(companionEnabled ? companionUrl : null, fetcher, {
    // No timer: SSE pushes drive refetches via mutate() below.
    refreshInterval: 0,
    revalidateOnFocus: false,
    keepPreviousData: true,
    shouldRetryOnError: false,
  });

  // SSE: mutate the companion SWR cache on every frame so the converter +
  // recommender pipeline runs against the freshest payload.
  const esRef = useRef<EventSource | null>(null);
  useEffect(() => {
    if (!companionEnabled || !companionToken) {
      esRef.current?.close();
      esRef.current = null;
      return;
    }
    const es = new EventSource(`/api/companion/stream?token=${encodeURIComponent(companionToken)}`);
    esRef.current = es;
    const refetch = () => {
      companion.mutate();
    };
    es.addEventListener("frame", refetch);
    return () => {
      es.removeEventListener("frame", refetch);
      es.close();
      esRef.current = null;
    };
  }, [companionEnabled, companionToken, companion]);

  // ---------------------------------------------------------------------------
  // Pick the better source. Companion wins when it has a real match because
  // it's our owned end-to-end realtime pipe; only fall back to Spectator when
  // companion is unpaired or the player isn't in a game.
  // ---------------------------------------------------------------------------
  const usingCompanion = !!(companion.data?.match && companionEnabled);
  const data: LivePayload | undefined = usingCompanion
    ? { ...(companion.data as LivePayload), viaCompanion: true }
    : polled.data;

  const error = usingCompanion ? companion.error : polled.error;
  const isLoading = usingCompanion ? companion.isLoading : polled.isLoading;

  // Track how many consecutive polls have returned no match. Lets the UI
  // escalate the message from "searching" → "no match yet" → "Riot may
  // not expose this match" instead of looping the same hopeful copy.
  // Companion path doesn't escalate the same way (the user is actively pairing
  // a desktop process), so the streak is computed off the polled path only.
  const [nullStreak, setNullStreak] = useState(0);
  const lastFetchedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!polled.data) return;
    if (polled.data.fetchedAt === lastFetchedAt.current) return;
    lastFetchedAt.current = polled.data.fetchedAt;
    if (polled.data.match) {
      setNullStreak(0);
    } else {
      setNullStreak((s) => s + 1);
    }
  }, [polled.data]);

  return {
    data,
    error,
    isLoading,
    nullStreak,
    /** True when the active payload was sourced from the Companion stream. */
    viaCompanion: usingCompanion,
    /** True when a companion token is paired in this browser, regardless of frames. */
    companionPaired: !!companionToken,
  };
}
