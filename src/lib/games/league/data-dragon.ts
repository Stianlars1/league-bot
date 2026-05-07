/**
 * Data Dragon: Riot's free static asset CDN. No API key needed.
 * We use it to map championId → champion name + image URL, and to seed the
 * `characters` table on cron.
 */

const DDRAGON = "https://ddragon.leagueoflegends.com";

type VersionsResponse = string[];

export async function latestVersion(): Promise<string> {
  const res = await fetch(`${DDRAGON}/api/versions.json`, { cache: "no-store" });
  if (!res.ok) throw new Error(`Data Dragon versions failed: ${res.status}`);
  const versions = (await res.json()) as VersionsResponse;
  return versions[0];
}

export interface DDragonChampion {
  id: string; // e.g. "Aatrox"
  key: string; // numeric ID as string, e.g. "266"
  name: string;
  title: string;
  tags: string[]; // e.g. ["Fighter", "Tank"]
  image: { full: string };
}

interface ChampionFile {
  data: Record<string, DDragonChampion>;
  version: string;
}

let cachedById: Map<number, DDragonChampion> | null = null;
let cachedVersion: string | null = null;

export async function getAllChampions(version?: string): Promise<{ version: string; champs: DDragonChampion[] }> {
  const v = version ?? (await latestVersion());
  const res = await fetch(`${DDRAGON}/cdn/${v}/data/en_US/champion.json`, {
    next: { revalidate: 60 * 60 * 24 },
  });
  if (!res.ok) throw new Error(`Data Dragon champion list failed: ${res.status}`);
  const data = (await res.json()) as ChampionFile;
  const champs = Object.values(data.data);
  cachedById = new Map(champs.map((c) => [Number(c.key), c]));
  cachedVersion = v;
  return { version: v, champs };
}

export async function championById(numericKey: number): Promise<DDragonChampion | undefined> {
  if (!cachedById) await getAllChampions();
  return cachedById?.get(numericKey);
}

export function championImageUrl(version: string, imageFull: string) {
  return `${DDRAGON}/cdn/${version}/img/champion/${imageFull}`;
}

export function squareIconUrl(version: string, championId: string) {
  return `${DDRAGON}/cdn/${version}/img/champion/${championId}.png`;
}

export function itemImageUrl(version: string, itemId: string | number): string {
  return `${DDRAGON}/cdn/${version}/img/item/${itemId}.png`;
}

export function getCachedVersion() {
  return cachedVersion;
}

/** Summoner spell static lookup. Hard-coded — only ~16 summs ever. */
export const SUMMONER_SPELLS: Record<number, string> = {
  1: "Cleanse",
  3: "Exhaust",
  4: "Flash",
  6: "Ghost",
  7: "Heal",
  11: "Smite",
  12: "Teleport",
  13: "Clarity",
  14: "Ignite",
  21: "Barrier",
  30: "To the King!",
  31: "Poro Toss",
  32: "Mark",
  39: "Mark",
  54: "Placeholder",
  55: "Placeholder Smite",
};
