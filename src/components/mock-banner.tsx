"use client";

import { useEffect, useState } from "react";

import styles from "./mock-banner.module.css";

interface MockBannerProps {
  mock: {
    scenarioId: string;
    scenarioLabel: string;
    scenarioIndex: number;
    totalScenarios: number;
    nextChangeIn: number;
  };
}

const ROTATION_TOTAL = 10;

export function MockBanner({ mock }: MockBannerProps) {
  // Local countdown so the progress bar animates smoothly between server polls.
  const [secondsLeft, setSecondsLeft] = useState(mock.nextChangeIn);

  useEffect(() => {
    setSecondsLeft(mock.nextChangeIn);
  }, [mock.nextChangeIn, mock.scenarioId]);

  useEffect(() => {
    const id = setInterval(() => {
      setSecondsLeft((s) => (s > 0 ? s - 1 : ROTATION_TOTAL));
    }, 1000);
    return () => clearInterval(id);
  }, []);

  const fillScale = Math.max(0, secondsLeft) / ROTATION_TOTAL;

  return (
    <div className={styles.banner} role="status" aria-live="polite">
      <span className={styles.label}>
        <span className={styles.labelDot} aria-hidden />
        Demo mode
      </span>
      <span className={styles.scenarioName}>{mock.scenarioLabel}</span>
      <span className={styles.scenarioCount}>
        {String(mock.scenarioIndex + 1).padStart(2, "0")} / {String(mock.totalScenarios).padStart(2, "0")}
      </span>
      <div className={styles.countdown}>
        <span>Next in {Math.max(0, secondsLeft)}s</span>
        <div className={styles.progressTrack} aria-hidden>
          <div
            className={styles.progressFill}
            style={{ transform: `scaleX(${fillScale})` }}
          />
        </div>
      </div>
    </div>
  );
}
