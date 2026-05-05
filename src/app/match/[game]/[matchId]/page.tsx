import Link from "next/link";
import { notFound } from "next/navigation";

import { Header } from "@/components/header";
import { MatchView } from "@/components/match-view";
import { convertMatchV5 } from "@/lib/games/league/adapter";
import {
  clusterForPlatform,
  matchDetails,
  platformFromMatchId,
} from "@/lib/games/league/riot-api";
import { isGameId } from "@/lib/games/registry";

import styles from "./page.module.css";

interface PageProps {
  params: Promise<{ game: string; matchId: string }>;
  searchParams: Promise<{ p?: string }>;
}

function formatDuration(seconds: number | undefined): string {
  if (!seconds || seconds < 0) return "0:00";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export default async function MatchPage({ params, searchParams }: PageProps) {
  const { game, matchId: rawMatchId } = await params;
  const { p } = await searchParams;

  if (!isGameId(game)) notFound();
  // Match-V5 is League-only. Dota match-detail will need its own data path.
  if (game !== "league") notFound();

  const matchId = decodeURIComponent(rawMatchId);
  const platform = platformFromMatchId(matchId);
  if (!platform) notFound();
  const cluster = clusterForPlatform(platform);

  let detail;
  try {
    detail = await matchDetails(cluster, matchId);
  } catch {
    notFound();
  }

  // Perspective: explicit ?p=<puuid> wins; otherwise fall back to the first
  // listed participant. Direct/shared URLs without ?p= still render — just
  // with arbitrary ally/enemy framing.
  const focusedPuuid =
    (p && detail.metadata.participants.includes(p) ? p : null) ?? detail.metadata.participants[0];
  const match = await convertMatchV5(detail, focusedPuuid);

  const focused = detail.info.participants.find((x) => x.puuid === focusedPuuid);
  const won = focused?.win ?? false;
  const durationStr = formatDuration(match.durationSeconds);

  return (
    <>
      <Header status="idle" meta={`Finished match · ${durationStr}`} />
      <main className={styles.shell}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          <Link href="/">← Home</Link>
          <span className={styles.crumbDivider}>·</span>
          <span>League of Legends</span>
          <span className={styles.crumbDivider}>·</span>
          <span className={styles.crumbName}>#{matchId}</span>
        </nav>

        <section className={styles.headStrip}>
          <span className={styles.outcome} data-win={won}>
            {won ? "Win" : "Loss"}
          </span>
          <span className={styles.headMeta}>
            {match.mode ?? "—"} · {durationStr} · {platform.toUpperCase()}
          </span>
        </section>

        <MatchView match={match} />
      </main>
    </>
  );
}
