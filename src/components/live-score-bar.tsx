"use client";

import { useTickingTime } from "@/hooks/use-ticking-time";
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
          {formatTime(ticking)}
        </span>
        <span className={styles.timerLabel}>Game time</span>
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
  const order: { key: keyof TeamScore; icon: string; label: string }[] = [
    { key: "towers", icon: "▲", label: "Towers" },
    { key: "drakes", icon: "◆", label: "Drakes" },
    { key: "heralds", icon: "✦", label: "Herald" },
    { key: "barons", icon: "✸", label: "Baron" },
    { key: "inhibitors", icon: "■", label: "Inhibs" },
  ];
  return (
    <div className={styles.objectives} style={{ justifyContent: align === "right" ? "flex-end" : "flex-start" }}>
      {order.map((o) => (
        <span key={o.key} className={styles.obj} data-active={s[o.key] > 0} title={o.label}>
          <span className={styles.objIcon}>{o.icon}</span>
          {s[o.key]}
        </span>
      ))}
    </div>
  );
}
