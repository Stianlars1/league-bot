import { notFound } from "next/navigation";

import { LiveView } from "@/components/live-view";
import { getAdapter, isGameId } from "@/lib/games/registry";

interface PageProps {
  params: Promise<{ game: string; id: string }>;
  searchParams: Promise<{ name?: string; region?: string; mock?: string }>;
}

export default async function LivePage({ params, searchParams }: PageProps) {
  const { game, id } = await params;
  const { name, region, mock } = await searchParams;

  if (!isGameId(game)) notFound();

  const adapter = getAdapter(game);

  return (
    <LiveView
      game={game}
      id={decodeURIComponent(id)}
      name={name}
      region={region}
      caveat={adapter.liveDataCaveat}
      mock={mock === "1"}
    />
  );
}
