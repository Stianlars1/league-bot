"use client";

import { motion } from "motion/react";

import { useTickingTime } from "@/hooks/use-ticking-time";
import type { MatchIntel, ObjectiveTimer } from "@/lib/games/types";

import styles from "./match-intel-strip.module.css";

interface MatchIntelStripProps {
  intel: MatchIntel;
  fetchedAt: number;
}

const OBJECTIVE_LABELS: Record<ObjectiveTimer["kind"], { label: string; icon: string }> = {
  drake: { label: "Drake", icon: "◆" },
  herald: { label: "Herald", icon: "✦" },
  baron: { label: "Baron", icon: "✸" },
  elder: { label: "Elder", icon: "❖" },
};

function formatCountdown(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  if (s === 0) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

export function MatchIntelStrip({ intel, fetchedAt }: MatchIntelStripProps) {
  return (
    <section className={styles.strip}>
      <WinProb intel={intel} />
      <Objectives intel={intel} fetchedAt={fetchedAt} />
    </section>
  );
}

function WinProb({ intel }: { intel: MatchIntel }) {
  const { ally, enemy, drivers } = intel.winProbability;
  return (
    <div className={styles.winCard}>
      <div className={styles.winHead}>
        <span className={styles.winLabel}>Win probability · live model</span>
        <div className={styles.winNumbers}>
          <span className={styles.winAlly}>{ally}%</span>
          <span className={styles.winSep}>/</span>
          <span className={styles.winEnemy}>{enemy}%</span>
        </div>
      </div>
      <div className={styles.winBar} role="img" aria-label={`Ally win chance ${ally}%`}>
        <motion.div
          className={styles.winFillAlly}
          initial={false}
          animate={{ width: `${ally}%` }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        />
        <motion.div
          className={styles.winFillEnemy}
          initial={false}
          animate={{ width: `${enemy}%` }}
          transition={{ duration: 0.6, ease: [0.23, 1, 0.32, 1] }}
        />
      </div>
      {drivers.length > 0 ? (
        <div className={styles.winDrivers}>
          {drivers.map((d) => (
            <span
              key={d.label}
              className={styles.driver}
              data-side={d.deltaPct > 0 ? "ally" : "enemy"}
              title={`${d.deltaPct > 0 ? "+" : ""}${d.deltaPct.toFixed(1)}pp impact`}
            >
              {d.label}
            </span>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Objectives({ intel, fetchedAt }: { intel: MatchIntel; fetchedAt: number }) {
  return (
    <div className={styles.objCard}>
      <div className={styles.objHead}>
        <span className={styles.winLabel}>Next objectives</span>
      </div>
      <div className={styles.objList}>
        {intel.objectives.map((o, i) => (
          <ObjectiveRow key={`${o.kind}-${i}`} obj={o} fetchedAt={fetchedAt} />
        ))}
      </div>
    </div>
  );
}

function ObjectiveRow({ obj, fetchedAt }: { obj: ObjectiveTimer; fetchedAt: number }) {
  const ticking = useTickingTime(Math.max(0, obj.inSeconds), fetchedAt);
  // Down-counter rather than up-counter
  const inSec = Math.max(0, obj.inSeconds - (ticking - obj.inSeconds));
  // Simpler: derive from time elapsed since fetch
  const sinceFetch = Math.floor((Date.now() - fetchedAt) / 1000);
  const remaining = Math.max(0, obj.inSeconds - sinceFetch);

  const labelInfo = OBJECTIVE_LABELS[obj.kind];
  const status = remaining <= 0 ? "available" : obj.status;

  // satisfy lint — read inSec to avoid unused warnings if implementation evolves
  void inSec;

  return (
    <div className={styles.objRow} data-status={status}>
      <span className={styles.objIcon}>{labelInfo.icon}</span>
      <div>
        <div className={styles.objLabel}>{labelInfo.label}</div>
        {obj.detail ? <div className={styles.objDetail}>{obj.detail}</div> : null}
      </div>
      <span className={styles.objCountdown} data-available={status === "available"}>
        {status === "available" ? "Available now" : status === "gone" ? "Gone" : `in ${formatCountdown(remaining)}`}
      </span>
    </div>
  );
}
