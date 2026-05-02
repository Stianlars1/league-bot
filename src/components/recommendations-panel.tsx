"use client";

import { AnimatePresence, motion } from "motion/react";

import type { Recommendation } from "@/lib/games/types";

import styles from "./recommendations-panel.module.css";

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  fetchedAt: number;
}

const CATEGORY_LABEL: Record<Recommendation["category"], string> = {
  "defensive-item": "Defensive item",
  "offensive-item": "Offensive item",
  "utility-item": "Utility",
  strategy: "Strategy",
  objective: "Objective",
  "lane-matchup": "Lane",
};

export function RecommendationsPanel({ recommendations, fetchedAt }: RecommendationsPanelProps) {
  return (
    <section className={styles.panel}>
      <div className={styles.header}>
        <div>
          <span className={styles.title}>Counterplay</span>
          <span className={styles.titleAccent}>{recommendations.length} signals</span>
        </div>
        <div className={styles.subtitle}>Updated {timeAgo(fetchedAt)}</div>
      </div>

      {recommendations.length === 0 ? (
        <div className={styles.empty}>
          No actionable signals yet. Recommendations populate once the recommender has
          enough hero/champion metadata.
        </div>
      ) : (
        <ul className={styles.list}>
          <AnimatePresence initial={false}>
            {recommendations.map((rec, idx) => (
              <motion.li
                key={rec.id}
                layout
                initial={{ opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, scale: 0.97, filter: "blur(4px)" }}
                transition={{
                  duration: 0.32,
                  delay: idx * 0.04,
                  ease: [0.23, 1, 0.32, 1],
                }}
                className={styles.card}
                data-severity={rec.severity}
              >
                <div className={styles.cardHeader}>
                  <span className={styles.severity} data-severity={rec.severity}>
                    {rec.severity}
                  </span>
                  <span className={styles.category}>{CATEGORY_LABEL[rec.category]}</span>
                </div>
                <h3 className={styles.cardTitle}>{rec.title}</h3>
                <p className={styles.cardBody}>{rec.body}</p>
                {rec.rationale ? (
                  <div className={styles.cardRationale}>
                    <strong>Why</strong>
                    <span>{rec.rationale}</span>
                  </div>
                ) : null}
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
    </section>
  );
}

function timeAgo(ts: number): string {
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 5_000) return "just now";
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  return `${min}m ago`;
}
