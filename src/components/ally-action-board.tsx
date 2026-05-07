"use client";

import { motion, useReducedMotion } from "motion/react";
import Image from "next/image";

import { leagueIcons } from "@/lib/games/league/icons";
import type { AllyAction } from "@/lib/games/types";

import { BuildPath } from "./build-path";
import styles from "./ally-action-board.module.css";

interface AllyActionBoardProps {
  actions: AllyAction[];
}

function ItemIcon({ name, large }: { name: string; large?: boolean }) {
  const url = leagueIcons.itemIcon(name);
  const cls = large ? styles.priorityIcon : styles.followIcon;
  if (!url) {
    return (
      <span className={large ? styles.priorityNoIcon : styles.followIcon}>
        {large ? "✦" : null}
      </span>
    );
  }
  const size = large ? 36 : 22;
  return (
    <span className={cls}>
      <Image src={url} alt="" width={size} height={size} unoptimized sizes={`${size}px`} />
    </span>
  );
}

export function AllyActionBoard({ actions }: AllyActionBoardProps) {
  const reduce = useReducedMotion();

  if (actions.length === 0) {
    return null;
  }

  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>
          Your team<span className={styles.titleAccent}>.</span>
        </h2>
        <span className={styles.subtitle}>Per-player build · in priority order</span>
      </div>

      <div className={styles.grid}>
        {actions.map((a, idx) => (
          <motion.article
            key={`${a.championId}-${idx}`}
            className={styles.card}
            initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{
              duration: 0.4,
              delay: 0.05 + idx * 0.05,
              ease: [0.23, 1, 0.32, 1],
            }}
          >
            <div className={styles.cardHead}>
              <div className={styles.portrait}>
                {a.imageUrl ? (
                  <Image src={a.imageUrl} alt={a.championName} width={48} height={48} unoptimized sizes="48px" />
                ) : null}
              </div>
              <div className={styles.cardHeadText}>
                <div className={styles.championName}>{a.championName}</div>
                <div className={styles.role}>
                  {a.position ? <span>{a.position}</span> : null}
                  {a.position && a.archetype ? <span className={styles.roleDot}>·</span> : null}
                  {a.archetype ? <span>{a.archetype}</span> : null}
                </div>
              </div>
            </div>

            <div className={styles.priority}>
              <span className={styles.priorityLabel}>Build first</span>
              <div className={styles.priorityHead}>
                <ItemIcon name={a.priority.item} large />
                <div className={styles.priorityItem}>{a.priority.item}</div>
              </div>
              <div className={styles.priorityReason}>{a.priority.reason}</div>
            </div>

            {a.followUps.length > 0 ? (
              <div className={styles.followBlock}>
                <span className={styles.followLabel}>Then build</span>
                <div className={styles.followList}>
                  {a.followUps.map((it, i) => {
                    const url = leagueIcons.itemIcon(it);
                    return (
                      <span
                        key={`${it}-${i}`}
                        className={`${styles.followItem} ${url ? "" : styles.followItemNoIcon}`}
                      >
                        {url ? (
                          <span className={styles.followIcon}>
                            <Image src={url} alt="" width={22} height={22} unoptimized sizes="22px" />
                          </span>
                        ) : (
                          <span className={styles.followIndex}>{i + 2}</span>
                        )}
                        {it}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {a.watchOut ? (
              <div className={styles.watchBlock}>
                <span className={styles.watchIcon} aria-hidden>
                  !
                </span>
                <div className={styles.watchText}>
                  <span className={styles.watchLabel}>Watch for</span>
                  <span className={styles.watchTarget}>{a.watchOut.championName}</span>
                  <span className={styles.watchReason}>{a.watchOut.reason}</span>
                </div>
              </div>
            ) : null}

            {a.buildPath && a.buildPath.length > 0 ? (
              <BuildPath steps={a.buildPath} source={a.source} />
            ) : null}
          </motion.article>
        ))}
      </div>
    </section>
  );
}
