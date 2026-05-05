"use client";

import Image from "next/image";
import Link from "next/link";

import type { GameId, MatchSummary } from "@/lib/games/types";

import styles from "./match-history-strip.module.css";

interface MatchHistoryStripProps {
  matches: MatchSummary[];
  /** When set to "league", each card becomes a Link to /match/league/<matchId>. */
  gameId?: GameId;
}

function formatAgo(ms: number): string {
  if (ms < 60_000) return "just now";
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}m ago`;
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}h ago`;
  return `${Math.floor(ms / 86_400_000)}d ago`;
}

function formatDuration(s: number): string {
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, "0")}`;
}

export function MatchHistoryStrip({ matches, gameId }: MatchHistoryStripProps) {
  if (matches.length === 0) return null;
  const linkable = gameId === "league";
  return (
    <section className={styles.section}>
      <div className={styles.head}>
        <h2 className={styles.title}>Recent matches</h2>
        <span className={styles.subtitle}>Last {matches.length}</span>
      </div>
      <div className={styles.list}>
        {matches.map((m) => {
          const inner = (
            <>
              <div className={styles.portrait}>
                {m.championImageUrl ? (
                  <Image src={m.championImageUrl} alt={m.championName} width={40} height={40} unoptimized sizes="40px" />
                ) : null}
              </div>
              <div className={styles.body}>
                <div className={styles.topLine}>
                  <span className={styles.champ}>{m.championName}</span>
                  <span className={styles.outcome} data-win={m.win}>{m.win ? "Win" : "Loss"}</span>
                </div>
                <div className={styles.kdaLine}>
                  <span>{m.kda.kills}/{m.kda.deaths}/{m.kda.assists}</span>
                  <span className={styles.kdaSep}>·</span>
                  <span>{m.cs} cs</span>
                </div>
                <div className={styles.metaLine}>
                  {m.position && m.position !== "Invalid" ? `${m.position} · ` : ""}
                  {formatDuration(m.durationSeconds)} · {formatAgo(m.endedMsAgo)}
                </div>
              </div>
            </>
          );
          if (linkable) {
            return (
              <Link
                key={m.matchId}
                href={`/match/league/${encodeURIComponent(m.matchId)}`}
                className={styles.card}
                data-win={m.win}
              >
                {inner}
              </Link>
            );
          }
          return (
            <div key={m.matchId} className={styles.card} data-win={m.win}>
              {inner}
            </div>
          );
        })}
      </div>
    </section>
  );
}
