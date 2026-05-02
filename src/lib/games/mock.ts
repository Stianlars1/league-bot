import { getAllyActions, getMatchPlan } from "./league/ally-actions";
import { computeMatchIntel } from "./league/intel";
import { leagueRecommender } from "./league/recommender";
import { buildMatchFromScenario, currentScenario, MOCK_SCENARIOS } from "./mock-scenarios";
import type { AllyAction, Match, MatchIntel, MatchPlan, Recommendation } from "./types";

export interface MockMeta {
  scenarioId: string;
  scenarioLabel: string;
  scenarioIndex: number;
  totalScenarios: number;
  /** Seconds remaining until the rotation flips to the next scenario */
  nextChangeIn: number;
}

export interface MockPayload {
  match: Match;
  recommendations: Recommendation[];
  allyActions: AllyAction[];
  plan: MatchPlan;
  intel: MatchIntel | null;
  fetchedAt: number;
  mock: MockMeta;
}

const ROTATION_SECONDS = 10;

export function buildMockPayload(): MockPayload {
  const scenario = currentScenario(ROTATION_SECONDS);
  const match = buildMatchFromScenario(scenario);
  const idx = MOCK_SCENARIOS.findIndex((s) => s.id === scenario.id);
  const elapsed = Math.floor(Date.now() / 1000) % ROTATION_SECONDS;
  return {
    match,
    recommendations: leagueRecommender.recommend(match),
    allyActions: getAllyActions(match),
    plan: getMatchPlan(match),
    intel: computeMatchIntel(match),
    fetchedAt: Date.now(),
    mock: {
      scenarioId: scenario.id,
      scenarioLabel: scenario.label,
      scenarioIndex: idx,
      totalScenarios: MOCK_SCENARIOS.length,
      nextChangeIn: ROTATION_SECONDS - elapsed,
    },
  };
}
