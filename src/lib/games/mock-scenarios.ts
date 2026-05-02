import type { Match, Participant } from "./types";
import { getChampMeta } from "./league/data";

const DDRAGON = "https://ddragon.leagueoflegends.com/cdn/14.24.1/img/champion";

interface SimpleParticipant {
  side: "ally" | "enemy";
  team: "blue" | "red";
  position: "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY";
  championId: string;
  championName: string;
  spell1?: string;
  spell2?: string;
}

function p(args: SimpleParticipant): Participant {
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

export interface MockScenario {
  id: string;
  label: string;
  matchId: string;
  durationSeconds: number;
  mode: string;
  ally: SimpleParticipant[];
  enemy: SimpleParticipant[];
}

/**
 * Each scenario is a different real-world archetype that exercises a
 * distinct cluster of recommender rules. Rotating between them shows
 * the full breadth of the analysis engine in ~30 seconds.
 */
export const MOCK_SCENARIOS: MockScenario[] = [
  // ---------- 1. AP healer wall + tank engage ----------
  {
    id: "ap-healer-wall",
    label: "AP healer wall · tank engage",
    matchId: "MOCK_4242",
    durationSeconds: 252,
    mode: "CLASSIC",
    ally: [
      { side: "ally", team: "blue", position: "TOP", championId: "Garen", championName: "Garen", spell2: "Teleport" },
      { side: "ally", team: "blue", position: "JUNGLE", championId: "LeeSin", championName: "Lee Sin", spell2: "Smite" },
      { side: "ally", team: "blue", position: "MIDDLE", championId: "Yasuo", championName: "Yasuo" },
      { side: "ally", team: "blue", position: "BOTTOM", championId: "Jhin", championName: "Jhin", spell2: "Heal" },
      { side: "ally", team: "blue", position: "UTILITY", championId: "Lulu", championName: "Lulu", spell2: "Ignite" },
    ],
    enemy: [
      { side: "enemy", team: "red", position: "TOP", championId: "Malphite", championName: "Malphite", spell2: "Teleport" },
      { side: "enemy", team: "red", position: "JUNGLE", championId: "Sejuani", championName: "Sejuani", spell2: "Smite" },
      { side: "enemy", team: "red", position: "MIDDLE", championId: "Annie", championName: "Annie" },
      { side: "enemy", team: "red", position: "BOTTOM", championId: "Caitlyn", championName: "Caitlyn", spell2: "Heal" },
      { side: "enemy", team: "red", position: "UTILITY", championId: "Soraka", championName: "Soraka", spell2: "Ignite" },
    ],
  },

  // ---------- 2. AD assassin dive ----------
  {
    id: "ad-dive-comp",
    label: "AD assassin dive · burst windows",
    matchId: "MOCK_8311",
    durationSeconds: 612,
    mode: "CLASSIC",
    ally: [
      { side: "ally", team: "blue", position: "TOP", championId: "Ornn", championName: "Ornn", spell2: "Teleport" },
      { side: "ally", team: "blue", position: "JUNGLE", championId: "Ivern", championName: "Ivern", spell2: "Smite" },
      { side: "ally", team: "blue", position: "MIDDLE", championId: "Lux", championName: "Lux" },
      { side: "ally", team: "blue", position: "BOTTOM", championId: "Sivir", championName: "Sivir", spell2: "Heal" },
      { side: "ally", team: "blue", position: "UTILITY", championId: "Janna", championName: "Janna", spell2: "Ignite" },
    ],
    enemy: [
      { side: "enemy", team: "red", position: "TOP", championId: "Renekton", championName: "Renekton", spell2: "Teleport" },
      { side: "enemy", team: "red", position: "JUNGLE", championId: "Kayn", championName: "Kayn", spell2: "Smite" },
      { side: "enemy", team: "red", position: "MIDDLE", championId: "Zed", championName: "Zed" },
      { side: "enemy", team: "red", position: "BOTTOM", championId: "Draven", championName: "Draven", spell2: "Heal" },
      { side: "enemy", team: "red", position: "UTILITY", championId: "Pyke", championName: "Pyke", spell2: "Ignite" },
    ],
  },

  // ---------- 3. Tank + chain CC engage hell ----------
  {
    id: "cc-engage-hell",
    label: "CC chain · tank engage",
    matchId: "MOCK_1717",
    durationSeconds: 924,
    mode: "CLASSIC",
    ally: [
      { side: "ally", team: "blue", position: "TOP", championId: "Fiora", championName: "Fiora", spell2: "Teleport" },
      { side: "ally", team: "blue", position: "JUNGLE", championId: "Graves", championName: "Graves", spell2: "Smite" },
      { side: "ally", team: "blue", position: "MIDDLE", championId: "TwistedFate", championName: "Twisted Fate" },
      { side: "ally", team: "blue", position: "BOTTOM", championId: "Caitlyn", championName: "Caitlyn", spell2: "Heal" },
      { side: "ally", team: "blue", position: "UTILITY", championId: "Karma", championName: "Karma", spell2: "Exhaust" },
    ],
    enemy: [
      { side: "enemy", team: "red", position: "TOP", championId: "Sion", championName: "Sion", spell2: "Teleport" },
      { side: "enemy", team: "red", position: "JUNGLE", championId: "Sejuani", championName: "Sejuani", spell2: "Smite" },
      { side: "enemy", team: "red", position: "MIDDLE", championId: "Galio", championName: "Galio" },
      { side: "enemy", team: "red", position: "BOTTOM", championId: "Ashe", championName: "Ashe", spell2: "Heal" },
      { side: "enemy", team: "red", position: "UTILITY", championId: "Leona", championName: "Leona", spell2: "Ignite" },
    ],
  },

  // ---------- 4. Late-game scaling carry comp ----------
  {
    id: "late-scaling",
    label: "Hyperscaling · race the clock",
    matchId: "MOCK_2099",
    durationSeconds: 1485,
    mode: "CLASSIC",
    ally: [
      { side: "ally", team: "blue", position: "TOP", championId: "Renekton", championName: "Renekton", spell2: "Teleport" },
      { side: "ally", team: "blue", position: "JUNGLE", championId: "Vi", championName: "Vi", spell2: "Smite" },
      { side: "ally", team: "blue", position: "MIDDLE", championId: "Annie", championName: "Annie" },
      { side: "ally", team: "blue", position: "BOTTOM", championId: "Lucian", championName: "Lucian", spell2: "Heal" },
      { side: "ally", team: "blue", position: "UTILITY", championId: "Nami", championName: "Nami", spell2: "Ignite" },
    ],
    enemy: [
      { side: "enemy", team: "red", position: "TOP", championId: "Yorick", championName: "Yorick", spell2: "Teleport" },
      { side: "enemy", team: "red", position: "JUNGLE", championId: "MasterYi", championName: "Master Yi", spell2: "Smite" },
      { side: "enemy", team: "red", position: "MIDDLE", championId: "Kassadin", championName: "Kassadin" },
      { side: "enemy", team: "red", position: "BOTTOM", championId: "Vayne", championName: "Vayne", spell2: "Heal" },
      { side: "enemy", team: "red", position: "UTILITY", championId: "Yuumi", championName: "Yuumi", spell2: "Ignite" },
    ],
  },

  // ---------- 5. Poke siege comp ----------
  {
    id: "poke-siege",
    label: "Poke siege · sustain pressure",
    matchId: "MOCK_5050",
    durationSeconds: 738,
    mode: "CLASSIC",
    ally: [
      { side: "ally", team: "blue", position: "TOP", championId: "Malphite", championName: "Malphite", spell2: "Teleport" },
      { side: "ally", team: "blue", position: "JUNGLE", championId: "Hecarim", championName: "Hecarim", spell2: "Smite" },
      { side: "ally", team: "blue", position: "MIDDLE", championId: "Diana", championName: "Diana" },
      { side: "ally", team: "blue", position: "BOTTOM", championId: "Samira", championName: "Samira", spell2: "Heal" },
      { side: "ally", team: "blue", position: "UTILITY", championId: "Rakan", championName: "Rakan", spell2: "Ignite" },
    ],
    enemy: [
      { side: "enemy", team: "red", position: "TOP", championId: "Jayce", championName: "Jayce", spell2: "Teleport" },
      { side: "enemy", team: "red", position: "JUNGLE", championId: "Nidalee", championName: "Nidalee", spell2: "Smite" },
      { side: "enemy", team: "red", position: "MIDDLE", championId: "Viktor", championName: "Viktor" },
      { side: "enemy", team: "red", position: "BOTTOM", championId: "Caitlyn", championName: "Caitlyn", spell2: "Heal" },
      { side: "enemy", team: "red", position: "UTILITY", championId: "Karma", championName: "Karma", spell2: "Ignite" },
    ],
  },
];

export function buildMatchFromScenario(scenario: MockScenario): Match {
  const ally = scenario.ally.map(p);
  const enemy = scenario.enemy.map(p);
  return {
    gameId: "league",
    matchId: scenario.matchId,
    mode: scenario.mode,
    startedAt: Date.now() - scenario.durationSeconds * 1000,
    durationSeconds: scenario.durationSeconds,
    teams: [{ participants: ally }, { participants: enemy }],
    meta: { raw: { mock: true, scenarioId: scenario.id, scenarioLabel: scenario.label } },
  };
}

/**
 * Pick a scenario based on wall-clock time so the mock UI rotates
 * between distinct match situations roughly every `intervalSeconds`.
 * This makes the polling demo show real state transitions.
 */
export function currentScenario(intervalSeconds = 8): MockScenario {
  const idx = Math.floor(Date.now() / (intervalSeconds * 1000)) % MOCK_SCENARIOS.length;
  return MOCK_SCENARIOS[idx];
}
