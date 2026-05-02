"use client";

import type { PowerSpike } from "@/lib/games/types";

import styles from "./power-spikes.module.css";

interface PowerSpikesProps {
  spikes: PowerSpike[];
}

function formatIn(seconds: number) {
  if (seconds <= 0) return { text: "now", urgency: "now" as const };
  if (seconds < 60) return { text: `${Math.round(seconds)}s`, urgency: "soon" as const };
  const m = Math.floor(seconds / 60);
  const s = Math.round(seconds % 60);
  const text = `${m}:${s.toString().padStart(2, "0")}`;
  if (seconds < 90) return { text, urgency: "soon" as const };
  return { text, urgency: "later" as const };
}

export function PowerSpikes({ spikes }: PowerSpikesProps) {
  if (spikes.length === 0) return null;

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Power spikes<span className={styles.titleAccent}>.</span>
        </h2>
        <span className={styles.subtitle}>Next 8 minutes · projected from gold + xp</span>
      </div>
      <div className={styles.list}>
        {spikes.map((s, idx) => {
          const t = formatIn(s.inSeconds);
          return (
            <div
              key={`${s.championId}-${idx}`}
              className={styles.card}
              data-side={s.side}
              data-importance={s.importance}
            >
              <div className={styles.timer}>
                <span
                  className={
                    `${styles.timerNumber} ` +
                    (t.urgency === "now"
                      ? styles.timerNumberNow
                      : t.urgency === "soon"
                        ? styles.timerNumberSoon
                        : "")
                  }
                >
                  {t.text}
                </span>
                <span className={styles.timerLabel}>away</span>
              </div>
              <div className={styles.body}>
                <span className={styles.spikeChamp}>
                  {s.championName}
                  <span className={styles.spikeSide} data-side={s.side}>
                    {s.side === "ally" ? "you" : "enemy"}
                  </span>
                </span>
                <span className={styles.spikeDesc}>{s.description}</span>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
