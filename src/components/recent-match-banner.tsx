"use client";

import styles from "./recent-match-banner.module.css";

interface RecentMatchBannerProps {
  endedMsAgo: number;
  playerName?: string;
}

function formatAgo(ms: number): string {
  if (ms < 60_000) return "just ended";
  if (ms < 3_600_000) {
    const m = Math.floor(ms / 60_000);
    return `${m} min ago`;
  }
  const h = Math.floor(ms / 3_600_000);
  return `${h} h ago`;
}

export function RecentMatchBanner({ endedMsAgo, playerName }: RecentMatchBannerProps) {
  return (
    <div className={styles.banner} role="status">
      <span className={styles.tag}>
        <span className={styles.tagDot} aria-hidden />
        Recent match
      </span>
      <div className={styles.body}>
        <span className={styles.headline}>
          Showing {playerName ? `${playerName}'s` : "the"} most recent completed match
        </span>
        <span className={styles.detail}>
          Riot Spectator-v5 isn&apos;t exposing live data right now (3-min delay, custom games,
          or a streamer-policy filter). All analysis below is from the player&apos;s last finished
          ranked match — refresh once they queue again to catch the live one.
        </span>
      </div>
      <span className={styles.timeAgo}>{formatAgo(endedMsAgo)}</span>
    </div>
  );
}
