"use client";

import Image from "next/image";

import type { LaneMatchup } from "@/lib/games/types";

import styles from "./lane-matchups.module.css";

interface LaneMatchupsProps {
  matchups: LaneMatchup[];
}

export function LaneMatchups({ matchups }: LaneMatchupsProps) {
  if (matchups.length === 0) return null;
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Lane matchups<span className={styles.titleAccent}>.</span>
        </h2>
        <span className={styles.subtitle}>Head-to-head · gold + cs + kda</span>
      </div>
      <div className={styles.list}>
        {matchups.map((m) => (
          <Row key={m.position} m={m} />
        ))}
      </div>
    </section>
  );
}

function Row({ m }: { m: LaneMatchup }) {
  // Map laneScore -100..100 to a horizontal fill from center to either side.
  // Width is half-bar (50% of container) scaled by abs(score)/100.
  const abs = Math.min(100, Math.abs(m.laneScore));
  const fillWidth = (abs / 100) * 50; // percent of bar
  const isAllyWinning = m.laneScore > 0;

  return (
    <div className={styles.row}>
      <span className={styles.position}>{m.position}</span>

      <div className={`${styles.side} ${styles.sideAlly}`}>
        <div className={styles.portrait}>
          {m.ally.imageUrl ? (
            <Image src={m.ally.imageUrl} alt={m.ally.championName} width={36} height={36} unoptimized sizes="36px" />
          ) : null}
        </div>
        <div className={styles.sideMeta}>
          <span className={styles.name}>{m.ally.championName}</span>
          {m.ally.stats ? (
            <span className={styles.kdaLine}>
              {m.ally.stats.kills}/{m.ally.stats.deaths}/{m.ally.stats.assists} · {m.ally.stats.cs} cs · {(m.ally.stats.gold / 1000).toFixed(1)}k
            </span>
          ) : null}
        </div>
      </div>

      <div className={styles.center}>
        <div className={styles.barWrap}>
          <div className={styles.barCenter} aria-hidden />
          <div
            className={styles.barFill}
            data-side={isAllyWinning ? "ally" : "enemy"}
            style={
              isAllyWinning
                ? { left: `${50 - fillWidth}%`, width: `${fillWidth}%` }
                : { left: `50%`, width: `${fillWidth}%` }
            }
          />
        </div>
        <span className={styles.summary}>{m.summary}</span>
      </div>

      <div className={`${styles.side} ${styles.sideRight} ${styles.sideEnemy}`}>
        <div className={styles.portrait}>
          {m.enemy.imageUrl ? (
            <Image src={m.enemy.imageUrl} alt={m.enemy.championName} width={36} height={36} unoptimized sizes="36px" />
          ) : null}
        </div>
        <div className={styles.sideMeta}>
          <span className={styles.name}>{m.enemy.championName}</span>
          {m.enemy.stats ? (
            <span className={styles.kdaLine}>
              {m.enemy.stats.kills}/{m.enemy.stats.deaths}/{m.enemy.stats.assists} · {m.enemy.stats.cs} cs · {(m.enemy.stats.gold / 1000).toFixed(1)}k
            </span>
          ) : null}
        </div>
      </div>

      <span className={styles.position} style={{ textAlign: "right" }}>
        {m.laneScore > 0 ? `+${m.laneScore}` : m.laneScore}
      </span>
    </div>
  );
}
