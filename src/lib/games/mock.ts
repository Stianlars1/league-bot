import { getAllyActions, getMatchPlan } from "./league/ally-actions";
import { getChampMeta } from "./league/data";
import { leagueRecommender } from "./league/recommender";
import type { AllyAction, Match, MatchPlan, Participant, Recommendation } from "./types";

/**
 * Mock match payload that exercises most recommender rules so the UI can be
 * inspected end-to-end without a live game. Uses real champion IDs that
 * match our curated metadata in `league/data.ts`.
 */

const DDRAGON = "https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion";

function p(args: {
  side: "ally" | "enemy";
  team: "blue" | "red";
  position: string;
  championId: string;
  championName: string;
  spell1?: string;
  spell2?: string;
}): Participant {
  const meta = getChampMeta(args.championId);
  return {
    side: args.side,
    team: args.team,
    position: args.position,
    character: {
      id: args.championId,
      name: args.championName,
      imageUrl: `${DDRAGON}/${args.championId}.png`,
      tags: meta?.tags,
      damageType: meta?.damageType,
      archetype: meta?.archetype,
    },
    summonerSpells: [args.spell1 ?? "Flash", args.spell2 ?? "Teleport"],
  };
}

function buildMockMatch(): Match {
  // Allies: balanced comp with a couple of squishies (triggers per-ally callout)
  const ally: Participant[] = [
    p({ side: "ally", team: "blue", position: "TOP", championId: "Garen", championName: "Garen", spell2: "Teleport" }),
    p({ side: "ally", team: "blue", position: "JUNGLE", championId: "LeeSin", championName: "Lee Sin", spell2: "Smite" }),
    p({ side: "ally", team: "blue", position: "MIDDLE", championId: "Yasuo", championName: "Yasuo" }),
    p({ side: "ally", team: "blue", position: "BOTTOM", championId: "Jhin", championName: "Jhin", spell2: "Heal" }),
    p({ side: "ally", team: "blue", position: "UTILITY", championId: "Lulu", championName: "Lulu", spell2: "Ignite" }),
  ];

  // Enemies: AP-heavy, healing-heavy, CC-heavy, two tanks, engage threat
  // Triggers: ap-heavy(critical), antiheal(high), tank-heavy(medium),
  //           cc-heavy(high), engage(medium), objective priority
  const enemy: Participant[] = [
    p({ side: "enemy", team: "red", position: "TOP", championId: "Malphite", championName: "Malphite", spell2: "Teleport" }),
    p({ side: "enemy", team: "red", position: "JUNGLE", championId: "Sejuani", championName: "Sejuani", spell2: "Smite" }),
    p({ side: "enemy", team: "red", position: "MIDDLE", championId: "Annie", championName: "Annie" }),
    p({ side: "enemy", team: "red", position: "BOTTOM", championId: "Caitlyn", championName: "Caitlyn", spell2: "Heal" }),
    p({ side: "enemy", team: "red", position: "UTILITY", championId: "Soraka", championName: "Soraka", spell2: "Ignite" }),
  ];

  return {
    gameId: "league",
    matchId: "MOCK_4242",
    mode: "CLASSIC",
    startedAt: Date.now() - 4 * 60 * 1000, // started 4 min ago
    durationSeconds: 4 * 60 + 12,
    teams: [{ participants: ally }, { participants: enemy }],
    meta: { raw: { mock: true } },
  };
}

export function buildMockPayload(): {
  match: Match;
  recommendations: Recommendation[];
  allyActions: AllyAction[];
  plan: MatchPlan;
  fetchedAt: number;
} {
  const match = buildMockMatch();
  return {
    match,
    recommendations: leagueRecommender.recommend(match),
    allyActions: getAllyActions(match),
    plan: getMatchPlan(match),
    fetchedAt: Date.now(),
  };
}
