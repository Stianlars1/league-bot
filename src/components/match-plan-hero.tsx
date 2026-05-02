"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";

import type { MatchPlan, Participant } from "@/lib/games/types";

import styles from "./match-plan-hero.module.css";

interface MatchPlanHeroProps {
  plan: MatchPlan;
  enemies?: Participant[];
}

export function MatchPlanHero({ plan, enemies }: MatchPlanHeroProps) {
  const reduce = useReducedMotion();
  const traits = plan.enemyArchetype.split(" · ");

  return (
    <motion.section
      className={styles.hero}
      initial={reduce ? false : { opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, ease: [0.23, 1, 0.32, 1] }}
    >
      <div className={styles.left}>
        <div className={styles.eyebrow}>
          <span className={styles.eyebrowDot} aria-hidden />
          Counter-strategy
        </div>
        <div className={styles.archetypeRow}>
          {traits.map((t) => (
            <span key={t} className={styles.archetypeChip}>
              {t}
            </span>
          ))}
        </div>
        {enemies && enemies.length > 0 ? (
          <div className={styles.enemyRow}>
            <span className={styles.enemyLabel}>vs</span>
            <div className={styles.enemyPortraits}>
              {enemies.map((p, i) => (
                <div
                  key={`${p.character.id}-${i}`}
                  className={styles.enemyPortrait}
                  title={p.character.name}
                >
                  {p.character.imageUrl ? (
                    <Image
                      src={p.character.imageUrl}
                      alt={p.character.name}
                      width={36}
                      height={36}
                      unoptimized
                      sizes="36px"
                    />
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
        <h2 className={styles.strategy}>
          {plan.counterStrategy}
        </h2>
      </div>

      <div className={styles.right}>
        <div className={styles.rightLabel}>Top priorities</div>
        <ol className={styles.actionList}>
          {plan.topActions.map((a, i) => (
            <motion.li
              key={a.title}
              className={styles.action}
              initial={reduce ? false : { opacity: 0, x: 8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.35, delay: 0.1 + i * 0.07, ease: [0.23, 1, 0.32, 1] }}
            >
              <span className={styles.actionIndex}>{String(i + 1).padStart(2, "0")}</span>
              <div className={styles.actionBody}>
                <div className={styles.actionTitle}>{a.title}</div>
                <div className={styles.actionDetail}>{a.detail}</div>
              </div>
            </motion.li>
          ))}
        </ol>
      </div>
    </motion.section>
  );
}
