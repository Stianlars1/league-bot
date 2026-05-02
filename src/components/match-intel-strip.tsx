"use client";

import { motion } from "motion/react";

import { useTickingTime } from "@/hooks/use-ticking-time";
import { useWinProbHistory } from "@/hooks/use-win-prob-history";
import { leagueIcons } from "@/lib/games/league/icons";
import type { MatchIntel, ObjectiveTimer } from "@/lib/games/types";

import styles from "./match-intel-strip.module.css";

interface MatchIntelStripProps {
  intel: MatchIntel;
  fetchedAt: number;
  matchId: string;
  /** When true, hide forward-looking elements like objective timers (post-game). */
  retrospective?: boolean;
}

const OBJECTIVE_LABELS: Record<ObjectiveTimer["kind"], string> = {
  drake: "Drake",
  herald: "Herald",
  baron: "Baron",
  elder: "Elder Dragon",
};

function formatCountdown(seconds: number) {
  const s = Math.max(0, Math.round(seconds));
  if (s === 0) return "now";
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rem = s % 60;
  return `${m}:${rem.toString().padStart(2, "0")}`;
}

export function MatchIntelStrip({ intel, fetchedAt, matchId, retrospective }: MatchIntelStripProps) {
  return (
    <section className={styles.strip} data-mode={retrospective ? "retrospective" : "live"}>
      <WinProb intel={intel} matchId={matchId} retrospective={retrospective} />
      {!retrospective ? <Objectives intel={intel} fetchedAt={fetchedAt} /> : <FinalSummary intel={intel} />}
    </section>
  );
}

function WinProb({ intel, matchId, retrospective }: { intel: MatchIntel; matchId: string; retrospective?: boolean }) {
  const { ally, enemy, drivers } = intel.winProbability;
  const history = useWinProbHistory(matchId, ally);
  void retrospective;
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
      {history.length >= 2 ? <Sparkline points={history} /> : null}
    </div>
  );
}

function Sparkline({ points }: { points: number[] }) {
  const w = 200;
  const h = 28;
  const min = 0;
  const max = 100;
  const stepX = points.length > 1 ? w / (points.length - 1) : 0;
  const path = points
    .map((v, i) => {
      const x = i * stepX;
      const y = h - ((v - min) / (max - min)) * h;
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(" ");
  const area = `${path} L${w},${h} L0,${h} Z`;
  const last = points[points.length - 1];
  const lastX = (points.length - 1) * stepX;
  const lastY = h - ((last - min) / (max - min)) * h;

  return (
    <div className={styles.spark}>
      <span className={styles.sparkLabel}>Trend</span>
      <svg className={styles.sparkSvg} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="sparkFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="hsl(var(--ally))" stopOpacity="0.3" />
            <stop offset="100%" stopColor="hsl(var(--ally))" stopOpacity="0" />
          </linearGradient>
        </defs>
        <line x1="0" y1={h / 2} x2={w} y2={h / 2} stroke="hsl(var(--border))" strokeDasharray="2 4" />
        <path d={area} fill="url(#sparkFill)" />
        <path d={path} fill="none" stroke="hsl(var(--ally))" strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
        <circle cx={lastX} cy={lastY} r="2.5" fill="hsl(var(--ally))" />
      </svg>
    </div>
  );
}

function FinalSummary({ intel }: { intel: MatchIntel }) {
  const winnerIsAlly = intel.winProbability.ally > intel.winProbability.enemy;
  const margin = Math.abs(intel.winProbability.ally - intel.winProbability.enemy);
  const verdict =
    margin >= 60 ? (winnerIsAlly ? "Dominant ally win" : "Dominant enemy win") :
    margin >= 25 ? (winnerIsAlly ? "Solid ally victory" : "Solid enemy victory") :
    margin >= 10 ? (winnerIsAlly ? "Close ally win" : "Close enemy win") :
    "Coinflip — could've gone either way";

  return (
    <div className={styles.objCard}>
      <div className={styles.objHead}>
        <span className={styles.winLabel}>Match summary</span>
      </div>
      <div className={styles.objList}>
        <div className={styles.objRow}>
          <span className={styles.objIcon}>★</span>
          <div>
            <div className={styles.objLabel}>{verdict}</div>
            <div className={styles.objDetail}>Final win-prob {intel.winProbability.ally}% / {intel.winProbability.enemy}%</div>
          </div>
        </div>
      </div>
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

  const label = OBJECTIVE_LABELS[obj.kind];
  const status = remaining <= 0 ? "available" : obj.status;

  // satisfy lint — read inSec to avoid unused warnings if implementation evolves
  void inSec;

  return (
    <div className={styles.objRow} data-status={status}>
      <span className={styles.objIcon}>{leagueIcons.objectiveIcon(obj.kind)}</span>
      <div>
        <div className={styles.objLabel}>{label}</div>
        {obj.detail ? <div className={styles.objDetail}>{obj.detail}</div> : null}
      </div>
      <span className={styles.objCountdown} data-available={status === "available"}>
        {status === "available" ? "Available now" : status === "gone" ? "Gone" : `in ${formatCountdown(remaining)}`}
      </span>
    </div>
  );
}
