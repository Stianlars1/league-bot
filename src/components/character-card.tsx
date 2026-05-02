"use client";

import Image from "next/image";

import type { Participant } from "@/lib/games/types";

import styles from "./character-card.module.css";

interface CharacterCardProps {
  participant: Participant;
  side: "ally" | "enemy";
}

const HIGH_TAGS = new Set(["healing", "burst", "engage", "stuns", "silences", "evasion"]);

export function CharacterCard({ participant, side }: CharacterCardProps) {
  const c = participant.character;
  const tags = (c.tags ?? []).slice(0, 3);

  const stats = participant.stats;

  return (
    <div className={styles.card} data-side={side} style={{ position: "relative" }}>
      {stats ? <span className={styles.level}>Lv {stats.level}</span> : null}
      <div className={styles.portrait}>
        {c.imageUrl ? (
          <Image
            src={c.imageUrl}
            alt={c.name}
            width={44}
            height={44}
            unoptimized
            sizes="44px"
          />
        ) : (
          <div className={styles.portraitFallback}>{c.name.slice(0, 2)}</div>
        )}
      </div>
      <div className={styles.body}>
        <div className={styles.name}>{c.name}</div>
        <div className={styles.meta}>
          {participant.position ? <span>{participant.position}</span> : null}
          {participant.position && c.damageType ? <span className={styles.metaDot}>·</span> : null}
          {c.damageType && c.damageType !== "unknown" ? (
            <span style={{ color: damageColor(c.damageType) }}>{c.damageType.toUpperCase()}</span>
          ) : null}
        </div>
        {stats ? (
          <div className={styles.statsRow}>
            <span className={styles.kda}>
              {stats.kills}/{stats.deaths}/{stats.assists}
            </span>
            <span className={styles.statSep}>·</span>
            <span>{stats.cs} cs</span>
            <span className={styles.statSep}>·</span>
            <span>{(stats.gold / 1000).toFixed(1)}k</span>
          </div>
        ) : null}
        {tags.length > 0 ? (
          <div className={styles.tags}>
            {tags.map((t) => (
              <span key={t} className={styles.tag} data-severity={HIGH_TAGS.has(t) ? "high" : "low"}>
                {t}
              </span>
            ))}
          </div>
        ) : null}
      </div>
    </div>
  );
}

function damageColor(type: string) {
  switch (type) {
    case "ad":
    case "physical":
      return "hsl(var(--severity-high))";
    case "ap":
    case "magical":
      return "hsl(var(--data))";
    case "hybrid":
      return "hsl(var(--ally))";
    case "pure":
      return "hsl(var(--severity-critical))";
    default:
      return "hsl(var(--muted))";
  }
}
