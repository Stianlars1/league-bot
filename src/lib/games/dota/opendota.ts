/**
 * OpenDota REST client. Free, no key required for the limits we need.
 * - /api/players/{account_id} validates a Steam account and returns profile.
 * - /api/heroes returns the full hero catalog with localized names + roles.
 */

const OPENDOTA = "https://api.opendota.com/api";

export class OpenDotaError extends Error {
  constructor(public readonly status: number, message: string) {
    super(message);
    this.name = "OpenDotaError";
  }
}

function withKey(url: string) {
  const key = process.env.OPENDOTA_API_KEY;
  if (!key) return url;
  return `${url}${url.includes("?") ? "&" : "?"}api_key=${encodeURIComponent(key)}`;
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(withKey(`${OPENDOTA}${path}`), { cache: "no-store" });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new OpenDotaError(res.status, text.slice(0, 200) || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export interface OpenDotaPlayer {
  profile?: {
    account_id: number;
    personaname?: string;
    name?: string;
    avatarfull?: string;
    loccountrycode?: string;
  };
}

export async function getPlayer(accountId: number): Promise<OpenDotaPlayer> {
  return fetchJson<OpenDotaPlayer>(`/players/${accountId}`);
}

export interface OpenDotaHero {
  id: number;
  name: string; // "npc_dota_hero_antimage"
  localized_name: string; // "Anti-Mage"
  primary_attr: "agi" | "str" | "int" | "all";
  attack_type: "Melee" | "Ranged";
  roles: string[];
  legs: number;
}

export async function getHeroes(): Promise<OpenDotaHero[]> {
  return fetchJson<OpenDotaHero[]>(`/heroes`);
}

/** Stratz returns heroId as numeric. Strip "npc_dota_hero_" to get short name. */
export function shortNameForOpenDota(hero: OpenDotaHero): string {
  return hero.name.replace(/^npc_dota_hero_/, "");
}

export function heroIconUrl(shortName: string): string {
  return `https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes/${shortName}.png`;
}
