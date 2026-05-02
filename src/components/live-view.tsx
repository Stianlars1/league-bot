"use client";

import Link from "next/link";

import { useLiveMatch } from "@/hooks/use-live-match";
import type { GameId } from "@/lib/games/types";

import { AllyActionBoard } from "./ally-action-board";
import { Header } from "./header";
import { LaneMatchups } from "./lane-matchups";
import { LiveScoreBar } from "./live-score-bar";
import styles from "./live-view.module.css";
import { MacroCallBanner } from "./macro-call-banner";
import { MatchIntelStrip } from "./match-intel-strip";
import { MatchPlanHero } from "./match-plan-hero";
import { MatchView } from "./match-view";
import { MockBanner } from "./mock-banner";
import { PowerSpikes } from "./power-spikes";
import { RecentMatchBanner } from "./recent-match-banner";
import { RecommendationsPanel } from "./recommendations-panel";

interface LiveViewProps {
  game: GameId;
  id: string;
  region?: string;
  name?: string;
  caveat?: string;
  mock?: boolean;
}

export function LiveView({ game, id, region, name, caveat, mock }: LiveViewProps) {
  const { data, error, isLoading, nullStreak } = useLiveMatch({ game, id, region, name, mock });
  const match = data?.match ?? null;
  const isPostGame = match?.liveStats?.source === "post-game";
  const status: "live" | "searching" | "error" =
    error || data?.error ? "error" : match ? "live" : "searching";

  const headerStatus = status === "live" && !isPostGame ? "live" : "idle";

  const gameLabel = game === "league" ? "League of Legends" : "Dota 2";

  return (
    <>
      <Header status={headerStatus} meta={mock ? "Polling every 5s · demo" : "Polling every 15s"} />
      <main className={styles.shell}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">← Home</Link>
          <span className={styles.crumbDivider}>·</span>
          <span>{gameLabel}</span>
          <span className={styles.crumbDivider}>·</span>
          <span className={styles.crumbName}>{name ?? id}</span>
        </nav>

        {status === "live" && match && data?.plan ? (
          <>
            {data.mock ? <MockBanner mock={data.mock} /> : null}

            {/* Recent-match callout when we fell back to Match-v5 */}
            {isPostGame && match.liveStats?.endedMsAgo !== undefined ? (
              <RecentMatchBanner
                endedMsAgo={match.liveStats.endedMsAgo}
                playerName={name}
              />
            ) : null}

            {/* The single most important tactical call right now (live only) */}
            {!isPostGame && data.intel?.macroCall ? (
              <MacroCallBanner
                key={`macro-${match.matchId}-${data.intel.macroCall.headline}`}
                call={data.intel.macroCall}
                fetchedAt={data.fetchedAt}
              />
            ) : null}

            {/* Hero card: enemy archetype + counter strategy + 3 top actions */}
            <MatchPlanHero
              key={`hero-${match.matchId}`}
              plan={data.plan}
              enemies={match.teams[1].participants}
            />

            {/* Live score: kills, towers, drakes + ticking game timer */}
            {match.liveStats ? (
              <LiveScoreBar
                key={`score-${match.matchId}`}
                liveStats={match.liveStats}
                fetchedAt={data.fetchedAt}
              />
            ) : null}

            {/* Win prob meter + objective spawn timers (live) or match summary (post-game) */}
            {data.intel ? (
              <MatchIntelStrip
                key={`intel-${match.matchId}`}
                intel={data.intel}
                fetchedAt={data.fetchedAt}
                matchId={match.matchId}
                retrospective={isPostGame}
              />
            ) : null}

            {/* Per-lane head-to-head */}
            {data.intel ? (
              <LaneMatchups
                key={`lanes-${match.matchId}`}
                matchups={data.intel.laneMatchups}
              />
            ) : null}

            {/* Upcoming power spikes — only meaningful for live games */}
            {!isPostGame && data.intel && data.intel.powerSpikes.length > 0 ? (
              <PowerSpikes
                key={`spikes-${match.matchId}`}
                spikes={data.intel.powerSpikes}
              />
            ) : null}

            {/* Status meta strip */}
            <section className={styles.statusStrip}>
              <Meta label="Match" value={`#${match.matchId}`} />
              <Meta label="Game" value={match.mode ?? "—"} />
              <Meta label="Region" value={(region ?? "—").toUpperCase()} />
              <Meta label="Polling" value={mock ? "5s" : "15s"} />
              <Meta label="Stats source" value={statsSourceLabel(match.liveStats?.source)} />
              <Meta label="Updated" value={formatTimeAgo(data.fetchedAt)} />
            </section>

            {/* The hero of the redesign: per-ally action cards */}
            <AllyActionBoard
              key={`board-${match.matchId}`}
              actions={data.allyActions}
            />

            {/* 5v5 reference */}
            <MatchView key={`view-${match.matchId}`} match={match} />

            {/* Team-wide signals — secondary now */}
            {data.recommendations.length > 0 ? (
              <RecommendationsPanel
                key={`recs-${match.matchId}`}
                recommendations={data.recommendations}
                fetchedAt={data.fetchedAt}
              />
            ) : null}
          </>
        ) : status === "searching" ? (
          <section className={styles.statusCard} data-status={status}>
            <span className={styles.statusBadge} data-status={status}>
              <span className={styles.statusDot} aria-hidden />
              {nullStreak >= 10 ? "Riot may not be exposing this match" : nullStreak >= 4 ? "No active match detected" : "Searching for match"}
            </span>
            <h1 className={styles.statusTitle}>
              {nullStreak >= 10 ? (
                <>Riot's Spectator API isn&apos;t returning data for {name ?? "this player"}</>
              ) : (
                <>
                  Watching for{" "}
                  <span style={{ color: "hsl(var(--severity-medium))" }}>{name ?? "your"}</span>{" "}
                  next match…
                </>
              )}
            </h1>
            <p className={styles.statusBody}>
              {caveat ?? "We poll for an active match every 15 seconds. Start a queue and this view will fill in once the game data unlocks."}
            </p>
            {isLoading ? null : (
              <div className={styles.metaRow}>
                <Meta label="Polls so far" value={String(nullStreak)} />
                <Meta label="Last check" value={data ? formatTimeAgo(data.fetchedAt) : "now"} />
                <Meta label="Polling" value="15s" />
              </div>
            )}

            {nullStreak >= 4 ? (
              <div className={styles.searchingNote}>
                <span className={styles.searchingNoteTitle}>Heads up — Riot Spectator-v5 limitation</span>
                <p className={styles.searchingNoteBody}>
                  Riot&apos;s Spectator API <strong>doesn&apos;t expose every live match</strong>. Custom games,
                  Practice Tool, and many <strong>streamer / featured matches are filtered out by Riot policy</strong> (anti
                  stream-sniping). Even if a player is clearly in a game, the API can return 404. There&apos;s no
                  alternative endpoint — this is intentional on Riot&apos;s side.
                </p>
                <p className={styles.searchingNoteBody}>
                  We&apos;ll keep polling — sometimes a match becomes visible after the first few minutes. If you
                  want to verify the UI works, try the sample match.
                </p>
                <div className={styles.searchingActions}>
                  <Link
                    href="/live/league/sample?mock=1&name=Sample+Match"
                    className={styles.searchingAction}
                  >
                    ► Open sample match
                  </Link>
                  <Link href="/" className={styles.searchingAction}>
                    ← Try another player
                  </Link>
                </div>
              </div>
            ) : (
              <div className={styles.searchingPolls}>
                <span className={styles.searchingDot} aria-hidden />
                Polling — {nullStreak} {nullStreak === 1 ? "check" : "checks"} so far
              </div>
            )}
          </section>
        ) : (
          <section className={styles.statusCard} data-status={status}>
            <span className={styles.statusBadge} data-status={status}>
              <span className={styles.statusDot} aria-hidden />
              Connection issue
            </span>
            <h1 className={styles.statusTitle}>Couldn&apos;t reach the live API</h1>
            <p className={styles.statusBody}>
              {data?.error ?? error?.message ?? "Unknown error. Check your API keys and try again."}
            </p>
            <div className={styles.error}>
              {data?.error ?? error?.message ?? "Try again in a moment — we'll keep polling."}
            </div>
          </section>
        )}
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

function statsSourceLabel(source: "mock" | "live-client" | "spectator-only" | "post-game" | undefined) {
  if (source === "mock") return "Mock data";
  if (source === "live-client") return "Live Client API";
  if (source === "spectator-only") return "Spectator (limited)";
  if (source === "post-game") return "Match-v5 (recent)";
  return "—";
}

function formatTimeAgo(ts: number) {
  const diff = Math.max(0, Date.now() - ts);
  if (diff < 5_000) return "just now";
  return `${Math.floor(diff / 1000)}s ago`;
}
