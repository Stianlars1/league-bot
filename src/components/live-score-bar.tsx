"use client";

import { useTickingTime } from "@/hooks/use-ticking-time";
import { leagueIcons } from "@/lib/games/league/icons";
import type { LiveStats, TeamScore } from "@/lib/games/types";

import styles from "./live-score-bar.module.css";

interface LiveScoreBarProps {
  liveStats: LiveStats;
  fetchedAt: number;
}

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function LiveScoreBar({ liveStats, fetchedAt }: LiveScoreBarProps) {
  const ticking = useTickingTime(liveStats.gameTimeSeconds, fetchedAt);

  if (liveStats.source === "spectator-only") {
    return (
      <section className={styles.bar} data-source={liveStats.source}>
        <div className={styles.side}>
          <span className={styles.label} data-team="ally">Your team</span>
          <div className={styles.unavailable}>
            <strong>Score not available</strong>
            <span>Riot Spectator-v5 doesn&apos;t expose live KDA</span>
          </div>
        </div>
        <div className={styles.center}>
          <span className={styles.timerLabel}>Game time</span>
          <span className={styles.timer}>
            <span className={styles.timerDot} aria-hidden />
            {formatTime(ticking)}
          </span>
        </div>
        <div className={styles.side + " " + styles.sideRight}>
          <span className={styles.label} data-team="enemy">Enemy</span>
          <div className={styles.unavailable}>
            <strong>—</strong>
            <span>Spectator policy ~3 min delay</span>
          </div>
        </div>
      </section>
    );
  }

  // post-game: same score bar layout, but timer label says "Final" + ago
  const isPostGame = liveStats.source === "post-game";
  const ago = liveStats.endedMsAgo;
  const agoLabel = ago === undefined ? "" : ago < 60_000 ? "Just ended" : ago < 3_600_000 ? `${Math.floor(ago / 60_000)} min ago` : `${Math.floor(ago / 3_600_000)} h ago`;

  const ally = liveStats.scores.ally;
  const enemy = liveStats.scores.enemy;

  return (
    <section className={styles.bar} data-source={liveStats.source}>
      <div className={styles.side}>
        <span className={styles.label} data-team="ally">Your team</span>
        <div className={styles.kills} data-team="ally">{ally.kills}</div>
        <ObjectiveRow s={ally} />
      </div>
      <div className={styles.center}>
        <span className={styles.dash}>—</span>
        <span className={styles.timer}>
          <span className={styles.timerDot} aria-hidden />
          {isPostGame ? formatTime(liveStats.gameTimeSeconds) : formatTime(ticking)}
        </span>
        <span className={styles.timerLabel}>{isPostGame ? `Final · ${agoLabel}` : "Game time"}</span>
      </div>
      <div className={styles.side + " " + styles.sideRight}>
        <span className={styles.label} data-team="enemy">Enemy</span>
        <div className={styles.kills} data-team="enemy">{enemy.kills}</div>
        <ObjectiveRow s={enemy} align="right" />
      </div>
    </section>
  );
}

function ObjectiveRow({ s, align }: { s: TeamScore; align?: "right" }) {
  const order: { key: keyof TeamScore; iconKind: Parameters<typeof leagueIcons.objectiveIcon>[0]; label: string }[] = [
    { key: "towers", iconKind: "tower", label: "Towers" },
    { key: "drakes", iconKind: "drake", label: "Drakes" },
    { key: "heralds", iconKind: "herald", label: "Herald" },
    { key: "barons", iconKind: "baron", label: "Baron" },
    { key: "inhibitors", iconKind: "inhibitor", label: "Inhibs" },
  ];
  return (
    <div className={styles.objectives} style={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
      {order.map((o) => (
        <span key={o.key} className={styles.obj} data-active={s[o.key] > 0} title={o.label}>
          <span className={styles.objIcon}>{leagueIcons.objectiveIcon(o.iconKind)}</span>
          {s[o.key]}
        </span>
      ))}
    </div>
  );
}
