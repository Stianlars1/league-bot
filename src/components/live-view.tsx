"use client";

import Link from "next/link";

import { useLiveMatch } from "@/hooks/use-live-match";
import type { GameId } from "@/lib/games/types";

import { Header } from "./header";
import styles from "./live-view.module.css";
import { MatchView } from "./match-view";
import { RecommendationsPanel } from "./recommendations-panel";

interface LiveViewProps {
  game: GameId;
  id: string;
  region?: string;
  name?: string;
  caveat?: string;
}

export function LiveView({ game, id, region, name, caveat }: LiveViewProps) {
  const { data, error, isLoading } = useLiveMatch({ game, id, region, name });
  const match = data?.match ?? null;
  const status: "live" | "searching" | "error" =
    error || data?.error ? "error" : match ? "live" : "searching";

  const headerStatus = status === "live" ? "live" : "idle";

  const gameLabel = game === "league" ? "League of Legends" : "Dota 2";

  return (
    <>
      <Header status={headerStatus} meta={`Polling every 15s`} />
      <main className={styles.shell}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">← Home</Link>
          <span className={styles.crumbDivider}>·</span>
          <span>{gameLabel}</span>
          <span className={styles.crumbDivider}>·</span>
          <span className={styles.crumbName}>{name ?? id}</span>
        </nav>

        <section className={styles.statusCard} data-status={status}>
          <span className={styles.statusBadge} data-status={status}>
            <span className={styles.statusDot} aria-hidden />
            {status === "live"
              ? "Live match · receiving updates"
              : status === "error"
                ? "Connection issue"
                : "Searching for match"}
          </span>

          {status === "live" && match ? (
            <>
              <h1 className={styles.statusTitle}>
                Match <span style={{ color: "hsl(var(--data))" }}>#{match.matchId}</span> in progress
              </h1>
              <p className={styles.statusBody}>
                Recommendations refresh as enemy items, runes, and matchups change.
                Apply the highest-severity callouts first.
              </p>
              <div className={styles.metaRow}>
                <Meta label="Game" value={match.mode ?? "—"} />
                <Meta label="Duration" value={formatDuration(match.durationSeconds)} />
                <Meta label="Region" value={(region ?? "—").toUpperCase()} />
                <Meta label="Polling" value="15s" />
              </div>
            </>
          ) : status === "searching" ? (
            <>
              <h1 className={styles.statusTitle}>
                Watching for <span style={{ color: "hsl(var(--severity-medium))" }}>{name ?? "your"}</span> next match…
              </h1>
              <p className={styles.statusBody}>
                {caveat ?? "We poll for an active match every 15 seconds. Start a queue and this view will fill in once the game data unlocks."}
              </p>
              {isLoading ? null : (
                <div className={styles.metaRow}>
                  <Meta label="Last check" value={data ? formatTimeAgo(data.fetchedAt) : "now"} />
                  <Meta label="Polling" value="15s" />
                </div>
              )}
            </>
          ) : (
            <>
              <h1 className={styles.statusTitle}>Couldn&apos;t reach the live API</h1>
              <p className={styles.statusBody}>
                {data?.error ?? error?.message ?? "Unknown error. Check your API keys and try again."}
              </p>
              <div className={styles.error}>
                {data?.error ?? error?.message ?? "Try again in a moment — we'll keep polling."}
              </div>
            </>
          )}
        </section>

        {match ? <MatchView match={match} /> : null}
        {match ? (
          <RecommendationsPanel
            recommendations={data?.recommendations ?? []}
            fetchedAt={data?.fetchedAt ?? Date.now()}
          />
        ) : null}
      </main>
    </>
  );
}

function Meta({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.metaItem}>
      <span className={styles.metaLabel}>{label}</span>
      <span className={styles.metaValue}>{value}</span>
    </div>
  );
}

function formatDuration(seconds: number | undefined) {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatTimeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 5_000) return "just now";
  return `${Math.floor(diff / 1000)}s ago`;
}
