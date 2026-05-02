import type { LiveStats, Match, Participant, ParticipantStats } from "./types";
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

interface RawStats {
  k: number;
  d: number;
  a: number;
  cs: number;
  gold: number;
}

interface TeamScoreRaw {
  kills: number;
  towers: number;
  drakes: number;
  heralds: number;
  barons: number;
  inhibitors: number;
}

export interface MockScenario {
  id: string;
  label: string;
  matchId: string;
  durationSeconds: number;
  mode: string;
  ally: SimpleParticipant[];
  enemy: SimpleParticipant[];
  scores: { ally: TeamScoreRaw; enemy: TeamScoreRaw };
  /** Champion ID → individual KDA/CS/gold. Levels derive from time. */
  participantStats: Record<string, RawStats>;
}

function lvl(durationSeconds: number, role: SimpleParticipant["position"]) {
  // CS-heavy roles (mid/top/adc) gain ~0.7 levels/min, junglers ~0.65, sup ~0.5
  const m = durationSeconds / 60;
  const rate =
    role === "UTILITY" ? 0.5 : role === "JUNGLE" ? 0.62 : 0.7;
  return Math.min(18, Math.max(1, Math.floor(1 + m * rate)));
}

function buildStatsRecord(
  scenario: Pick<MockScenario, "ally" | "enemy" | "participantStats" | "durationSeconds">,
): Record<string, ParticipantStats> {
  const out: Record<string, ParticipantStats> = {};
  for (const list of [scenario.ally, scenario.enemy]) {
    for (const p of list) {
      const raw = scenario.participantStats[p.championId];
      if (!raw) continue;
      out[p.championId] = {
        kills: raw.k,
        deaths: raw.d,
        assists: raw.a,
        cs: raw.cs,
        gold: raw.gold,
        level: lvl(scenario.durationSeconds, p.position),
      };
    }
  }
  return out;
}

function p(args: SimpleParticipant, stats?: ParticipantStats): Participant {
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
    stats,
  };
}

/**
 * Each scenario is a different real-world archetype that exercises a
 * distinct cluster of recommender rules + a distinct game state
 * (early skirmish, mid teamfights, late-game macro).
 */
export const MOCK_SCENARIOS: MockScenario[] = [
  // ---------- 1. AP healer wall — early skirmishes (4 min in) ----------
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
    scores: {
      ally: { kills: 2, towers: 0, drakes: 0, heralds: 0, barons: 0, inhibitors: 0 },
      enemy: { kills: 4, towers: 0, drakes: 1, heralds: 0, barons: 0, inhibitors: 0 },
    },
    participantStats: {
      Garen: { k: 0, d: 1, a: 1, cs: 38, gold: 2200 },
      LeeSin: { k: 1, d: 1, a: 1, cs: 24, gold: 2400 },
      Yasuo: { k: 1, d: 1, a: 0, cs: 41, gold: 2600 },
      Jhin: { k: 0, d: 1, a: 1, cs: 35, gold: 2150 },
      Lulu: { k: 0, d: 0, a: 2, cs: 8, gold: 1800 },
      Malphite: { k: 1, d: 0, a: 2, cs: 36, gold: 2700 },
      Sejuani: { k: 1, d: 0, a: 2, cs: 22, gold: 2650 },
      Annie: { k: 1, d: 1, a: 1, cs: 39, gold: 2750 },
      Caitlyn: { k: 1, d: 1, a: 0, cs: 42, gold: 2800 },
      Soraka: { k: 0, d: 0, a: 3, cs: 6, gold: 1900 },
    },
  },

  // ---------- 2. AD assassin dive — mid game (10 min in) ----------
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
    scores: {
      ally: { kills: 7, towers: 1, drakes: 1, heralds: 0, barons: 0, inhibitors: 0 },
      enemy: { kills: 12, towers: 2, drakes: 1, heralds: 1, barons: 0, inhibitors: 0 },
    },
    participantStats: {
      Ornn: { k: 1, d: 2, a: 4, cs: 92, gold: 6200 },
      Ivern: { k: 0, d: 1, a: 6, cs: 38, gold: 5400 },
      Lux: { k: 2, d: 3, a: 3, cs: 78, gold: 6100 },
      Sivir: { k: 3, d: 2, a: 1, cs: 102, gold: 7300 },
      Janna: { k: 1, d: 2, a: 5, cs: 18, gold: 5200 },
      Renekton: { k: 3, d: 2, a: 4, cs: 88, gold: 7100 },
      Kayn: { k: 2, d: 1, a: 5, cs: 42, gold: 6900 },
      Zed: { k: 4, d: 2, a: 3, cs: 95, gold: 8400 },
      Draven: { k: 2, d: 1, a: 3, cs: 118, gold: 8800 },
      Pyke: { k: 1, d: 1, a: 7, cs: 14, gold: 6200 },
    },
  },

  // ---------- 3. CC chain · tank engage — mid-late (15 min in) ----------
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
    scores: {
      ally: { kills: 14, towers: 4, drakes: 2, heralds: 1, barons: 0, inhibitors: 0 },
      enemy: { kills: 9, towers: 1, drakes: 1, heralds: 0, barons: 0, inhibitors: 0 },
    },
    participantStats: {
      Fiora: { k: 5, d: 2, a: 2, cs: 158, gold: 10800 },
      Graves: { k: 4, d: 1, a: 4, cs: 92, gold: 9700 },
      TwistedFate: { k: 2, d: 3, a: 8, cs: 134, gold: 9100 },
      Caitlyn: { k: 3, d: 2, a: 5, cs: 162, gold: 11200 },
      Karma: { k: 0, d: 1, a: 11, cs: 22, gold: 7900 },
      Sion: { k: 2, d: 4, a: 5, cs: 142, gold: 9400 },
      Sejuani: { k: 0, d: 3, a: 6, cs: 56, gold: 7800 },
      Galio: { k: 1, d: 4, a: 4, cs: 112, gold: 7600 },
      Ashe: { k: 5, d: 2, a: 3, cs: 138, gold: 9800 },
      Leona: { k: 1, d: 2, a: 7, cs: 16, gold: 7100 },
    },
  },

  // ---------- 4. Late game scaling — closing window (24 min in) ----------
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
    scores: {
      ally: { kills: 18, towers: 5, drakes: 3, heralds: 1, barons: 0, inhibitors: 1 },
      enemy: { kills: 21, towers: 6, drakes: 1, heralds: 0, barons: 1, inhibitors: 0 },
    },
    participantStats: {
      Renekton: { k: 5, d: 4, a: 6, cs: 218, gold: 14800 },
      Vi: { k: 3, d: 5, a: 8, cs: 132, gold: 12600 },
      Annie: { k: 6, d: 3, a: 5, cs: 234, gold: 15400 },
      Lucian: { k: 2, d: 5, a: 6, cs: 224, gold: 14200 },
      Nami: { k: 2, d: 4, a: 14, cs: 28, gold: 10800 },
      Yorick: { k: 4, d: 4, a: 6, cs: 246, gold: 15600 },
      MasterYi: { k: 8, d: 2, a: 5, cs: 198, gold: 17800 },
      Kassadin: { k: 5, d: 3, a: 7, cs: 228, gold: 15200 },
      Vayne: { k: 3, d: 4, a: 5, cs: 232, gold: 14600 },
      Yuumi: { k: 1, d: 4, a: 18, cs: 8, gold: 9800 },
    },
  },

  // ---------- 5. Poke siege — mid game (12 min in) ----------
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
    scores: {
      ally: { kills: 5, towers: 1, drakes: 1, heralds: 0, barons: 0, inhibitors: 0 },
      enemy: { kills: 11, towers: 3, drakes: 1, heralds: 1, barons: 0, inhibitors: 0 },
    },
    participantStats: {
      Malphite: { k: 1, d: 3, a: 3, cs: 96, gold: 6800 },
      Hecarim: { k: 2, d: 2, a: 3, cs: 64, gold: 7200 },
      Diana: { k: 1, d: 3, a: 2, cs: 108, gold: 7100 },
      Samira: { k: 0, d: 2, a: 2, cs: 132, gold: 7400 },
      Rakan: { k: 1, d: 2, a: 4, cs: 22, gold: 5900 },
      Jayce: { k: 4, d: 1, a: 2, cs: 144, gold: 9200 },
      Nidalee: { k: 2, d: 1, a: 5, cs: 72, gold: 8200 },
      Viktor: { k: 3, d: 0, a: 4, cs: 138, gold: 9100 },
      Caitlyn: { k: 1, d: 1, a: 3, cs: 158, gold: 9400 },
      Karma: { k: 1, d: 2, a: 6, cs: 26, gold: 6600 },
    },
  },
];

export function buildMatchFromScenario(scenario: MockScenario): Match {
  const stats = buildStatsRecord(scenario);

  const allyParts = scenario.ally.map((sp) => p(sp, stats[sp.championId]));
  const enemyParts = scenario.enemy.map((sp) => p(sp, stats[sp.championId]));

  const liveStats: LiveStats = {
    gameTimeSeconds: scenario.durationSeconds,
    source: "mock",
    scores: { ally: scenario.scores.ally, enemy: scenario.scores.enemy },
  };

  return {
    gameId: "league",
    matchId: scenario.matchId,
    mode: scenario.mode,
    startedAt: Date.now() - scenario.durationSeconds * 1000,
    durationSeconds: scenario.durationSeconds,
    teams: [{ participants: allyParts }, { participants: enemyParts }],
    liveStats,
    meta: { raw: { mock: true, scenarioId: scenario.id, scenarioLabel: scenario.label } },
  };
}

/**
 * Pick a scenario based on wall-clock time so the mock UI rotates
 * between distinct match situations roughly every `intervalSeconds`.
 */
export function currentScenario(intervalSeconds = 10): MockScenario {
  const idx = Math.floor(Date.now() / (intervalSeconds * 1000)) % MOCK_SCENARIOS.length;
  return MOCK_SCENARIOS[idx];
}
