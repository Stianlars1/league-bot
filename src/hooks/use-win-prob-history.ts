"use client";

import { useEffect, useRef, useState } from "react";

const MAX_POINTS = 24;

/**
 * Track win-probability across polls so the UI can render a trend
 * sparkline. Resets when matchId changes (new scenario / match).
 */
export function useWinProbHistory(matchId: string | null, allyPct: number | null) {
  const [history, setHistory] = useState<number[]>([]);
  const lastMatchId = useRef<string | null>(null);
  const lastValue = useRef<number | null>(null);

  useEffect(() => {
    if (!matchId || allyPct === null) return;

    if (lastMatchId.current !== matchId) {
      lastMatchId.current = matchId;
      lastValue.current = allyPct;
      setHistory([allyPct]);
      return;
    }

    if (lastValue.current === allyPct) return;
    lastValue.current = allyPct;
    setHistory((prev) => {
      const next = [...prev, allyPct];
      if (next.length > MAX_POINTS) next.shift();
      return next;
    });
  }, [matchId, allyPct]);

  return history;
}
