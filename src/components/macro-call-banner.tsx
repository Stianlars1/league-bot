"use client";

import { motion, useReducedMotion } from "motion/react";

import { useTickingTime } from "@/hooks/use-ticking-time";
import type { MacroCall } from "@/lib/games/types";

import styles from "./macro-call-banner.module.css";

interface MacroCallBannerProps {
  call: MacroCall;
  fetchedAt: number;
}

function formatSec(s: number) {
  if (s <= 0) return "now";
  if (s < 60) return `${Math.round(s)}s`;
  const m = Math.floor(s / 60);
  const r = Math.round(s % 60);
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function MacroCallBanner({ call, fetchedAt }: MacroCallBannerProps) {
  const reduce = useReducedMotion();
  const ticking = useTickingTime(call.inSeconds ?? 0, fetchedAt);
  const sinceFetch = Math.floor((Date.now() - fetchedAt) / 1000);
  const remaining = call.inSeconds !== undefined ? Math.max(0, call.inSeconds - sinceFetch) : null;
  void ticking;

  return (
    <motion.div
      className={styles.banner}
      data-urgency={call.urgency}
      initial={reduce ? false : { opacity: 0, y: -6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
    >
      <span className={styles.tagBadge}>
        <span className={styles.tagDot} aria-hidden />
        {call.tag}
      </span>
      <div className={styles.callBody}>
        <span className={styles.headline}>{call.headline}</span>
        <span className={styles.body}>{call.body}</span>
      </div>
      {remaining !== null ? (
        <div className={styles.countdown}>
          <span className={styles.countdownNumber}>{formatSec(remaining)}</span>
          <span className={styles.countdownLabel}>{remaining <= 0 ? "active" : "until"}</span>
        </div>
      ) : null}
    </motion.div>
  );
}
