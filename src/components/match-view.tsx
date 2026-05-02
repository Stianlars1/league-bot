"use client";

import type { Match } from "@/lib/games/types";

import { CharacterCard } from "./character-card";
import styles from "./match-view.module.css";

interface MatchViewProps {
  match: Match;
}

function formatDuration(seconds: number | undefined) {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function MatchView({ match }: MatchViewProps) {
  const ally = match.teams[0].participants;
  const enemy = match.teams[1].participants;

  return (
    <div className={styles.wrap}>
      <Team
        side="ally"
        label={teamSideLabel(match, "ally")}
        meta={`${ally.length} alive · ${formatDuration(match.durationSeconds)}`}
      >
        {ally.map((p, idx) => (
          <CharacterCard key={`ally-${p.character.id}-${idx}`} participant={p} side="ally" />
        ))}
      </Team>
      <Team
        side="enemy"
        label={teamSideLabel(match, "enemy")}
        meta={`${enemy.length} threats · ${match.mode ?? ""}`}
      >
        {enemy.map((p, idx) => (
          <CharacterCard key={`enemy-${p.character.id}-${idx}`} participant={p} side="enemy" />
        ))}
      </Team>
    </div>
  );
}

function teamSideLabel(match: Match, side: "ally" | "enemy"): string {
  if (match.gameId === "dota") {
    const team = match.teams[side === "ally" ? 0 : 1].participants[0]?.team;
    if (team === "radiant") return side === "ally" ? "You · Radiant" : "Enemy · Radiant";
    if (team === "dire") return side === "ally" ? "You · Dire" : "Enemy · Dire";
  }
  if (match.gameId === "league") {
    const team = match.teams[side === "ally" ? 0 : 1].participants[0]?.team;
    if (team === "blue") return side === "ally" ? "You · Blue" : "Enemy · Blue";
    if (team === "red") return side === "ally" ? "You · Red" : "Enemy · Red";
  }
  return side === "ally" ? "You" : "Enemy";
}

function Team({
  side,
  label,
  meta,
  children,
}: {
  side: "ally" | "enemy";
  label: string;
  meta: string;
  children: React.ReactNode;
}) {
  return (
    <div className={styles.team}>
      <div className={styles.teamHeader}>
        <div className={styles.teamLabel} data-side={side}>
          <span className={styles.teamDot} aria-hidden />
          {label}
        </div>
        <div className={styles.teamMeta}>{meta}</div>
      </div>
      <div className={styles.list}>{children}</div>
    </div>
  );
}
