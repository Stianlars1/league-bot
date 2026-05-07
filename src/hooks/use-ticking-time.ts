"use client";

import { useEffect, useState } from "react";

/**
 * Returns an integer second counter that ticks up 1/sec from `serverSeconds`,
 * resyncing whenever the server value changes (e.g. on every poll). This
 * keeps the duration display feeling live between SWR refreshes.
 */
export function useTickingTime(serverSeconds: number, lastSyncedAt: number) {
  const [now, setNow] = useState(() => serverSeconds);

  useEffect(() => {
    // Resyncs local clock to the server-provided value on every poll so
    // duration display stays accurate across SWR refreshes.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- server-driven resync of locally-ticking clock
    setNow(serverSeconds);
  }, [serverSeconds, lastSyncedAt]);

  useEffect(() => {
    const id = setInterval(() => {
      setNow((s) => s + 1);
    }, 1000);
    return () => clearInterval(id);
  }, []);

  return now;
}
