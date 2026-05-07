/**
 * Data Dragon item taxonomy. Classifies LoL items into stat-tag buckets the
 * recommender uses to detect threat patterns from enemy item presence.
 *
 * Loaded once per process via `ensureItemDb()` (called from API routes before
 * the recommender runs). Subsequent calls in the same Fluid Compute instance
 * hit the module-scope cache.
 *
 * Classification is pure derivation from Riot-published data:
 *   - statTags from Riot's `tags` array (first-party)
 *   - AntiHeal from "Grievous Wounds" appearing in the item description
 *   - Healing/Shielding from active-effect text in the item description
 *   - isLegendary/isBoots/isComponent from the items' build relationships
 *
 * No invented mappings. If a check would require knowledge outside the
 * Data Dragon JSON, it's deferred to Layer 2 (curated counter-graph).
 */

import { latestVersion } from "./data-dragon";

export type StatTag =
  | "AP"
  | "AD"
  | "MR"
  | "Armor"
  | "HP"
  | "Mana"
  | "Lifesteal"
  | "Omnivamp"
  | "Healing"
  | "Shielding"
  | "AntiHeal"
  | "ArmorPen"
  | "MagicPen"
  | "AttackSpeed"
  | "AbilityHaste"
  | "Tenacity"
  | "CriticalStrike"
  | "MovementSpeed";

export interface ItemTag {
  id: string;
  name: string;
  cost: number;
  isLegendary: boolean;
  isBoots: boolean;
  isComponent: boolean;
  statTags: Set<StatTag>;
  /** Riot Data Dragon `from` array — sub-component item IDs that build
   *  into this item. Used by the recommender to detect when an ally
   *  already owns a component and compute the upgrade cost. Empty for
   *  components and items with no build path. */
  from: string[];
}

interface DataDragonItem {
  name: string;
  description: string;
  plaintext: string;
  gold: { total: number; purchasable: boolean };
  tags: string[];
  into?: string[];
  from?: string[];
  stats?: Record<string, number>;
  // Maps where the item is available. We only care about Summoner's Rift (11).
  maps?: Record<string, boolean>;
}

interface ItemsResponse {
  data: Record<string, DataDragonItem>;
  version: string;
}

const DDRAGON = "https://ddragon.leagueoflegends.com";

let cached: { version: string; map: Map<string, ItemTag> } | undefined;
let inflight: Promise<Map<string, ItemTag>> | undefined;

/**
 * Loads (or returns the cached) item DB. Idempotent across concurrent callers
 * via the in-flight promise — Fluid Compute can dispatch multiple requests
 * to the same instance before the first fetch resolves.
 */
export async function ensureItemDb(): Promise<Map<string, ItemTag>> {
  const version = await latestVersion();
  if (cached?.version === version) return cached.map;
  if (inflight) return inflight;

  inflight = (async () => {
    const res = await fetch(`${DDRAGON}/cdn/${version}/data/en_US/item.json`, {
      next: { revalidate: 60 * 60 * 24 },
    });
    if (!res.ok) throw new Error(`Data Dragon items fetch failed: ${res.status}`);
    const json = (await res.json()) as ItemsResponse;
    const map = new Map<string, ItemTag>();
    for (const [id, item] of Object.entries(json.data)) {
      // Skip non-purchasable (consumables, jungle items in some seasons) and
      // non-SR items (ARAM-only, Twisted Treeline relics).
      if (!item.gold.purchasable) continue;
      if (item.maps && item.maps["11"] === false) continue;
      map.set(id, classifyItem(id, item));
    }
    cached = { version, map };
    inflight = undefined;
    return map;
  })();

  return inflight;
}

/** Synchronous read after `ensureItemDb()` has resolved. Returns undefined
 *  for items not in the DB (e.g. trinkets, bounty wards). */
export function getItemTag(itemId: string): ItemTag | undefined {
  return cached?.map.get(itemId);
}

/** True if the item DB has been loaded in this process. Routes can use this
 *  to decide whether to await the warmup or skip item-aware logic. */
export function isItemDbReady(): boolean {
  return cached !== undefined;
}

function classifyItem(id: string, item: DataDragonItem): ItemTag {
  const cost = item.gold.total;
  const tags = new Set(item.tags);

  // Boot detection: Riot tags every boot variant (Boots, Plated Steelcaps,
  // Mercury's Treads, Ionian Boots, Berserker's, Sorcerer's, Swifties, etc.)
  // with the "Boots" tag.
  const isBoots = tags.has("Boots") || id === "1001";

  // Components have an `into` array (they build into something else).
  const intoCount = item.into?.length ?? 0;
  const isComponent = !isBoots && intoCount > 0;
  // Legendary = completed combat item with no further build path AND
  // priced at the legendary tier (>=1500g). The cost gate excludes starter
  // items (Doran's Ring/Blade/Shield, Tear post-buff, Cull, etc.) which
  // technically have no `into` but aren't legendary in any meaningful sense.
  const isLegendary = !isBoots && !isComponent && cost >= 1500;

  const statTags = new Set<StatTag>();

  // Tag-based stat classification (Riot-published).
  if (tags.has("SpellDamage")) statTags.add("AP");
  if (tags.has("Damage")) statTags.add("AD");
  if (tags.has("MagicResist") || tags.has("SpellBlock")) statTags.add("MR");
  if (tags.has("Armor")) statTags.add("Armor");
  if (tags.has("Health")) statTags.add("HP");
  if (tags.has("Mana") || tags.has("ManaRegen")) statTags.add("Mana");
  if (tags.has("LifeSteal")) statTags.add("Lifesteal");
  if (tags.has("ArmorPenetration")) statTags.add("ArmorPen");
  if (tags.has("MagicPenetration")) statTags.add("MagicPen");
  if (tags.has("AttackSpeed")) statTags.add("AttackSpeed");
  if (tags.has("AbilityHaste") || tags.has("CooldownReduction")) statTags.add("AbilityHaste");
  if (tags.has("Tenacity")) statTags.add("Tenacity");
  if (tags.has("CriticalStrike")) statTags.add("CriticalStrike");
  if (tags.has("NonbootsMovement")) statTags.add("MovementSpeed");

  // Description-based detection. Riot publishes free-text descriptions; we
  // match well-known mechanic phrases. Each match is traceable to the
  // item's `description` or `plaintext` field in Data Dragon.
  const desc = `${item.description} ${item.plaintext}`;

  // AntiHeal: every Grievous-Wounds-applying item has the phrase "Grievous
  // Wounds" in its description. This is the canonical Riot text.
  if (/grievous wounds/i.test(desc)) statTags.add("AntiHeal");

  // Omnivamp: shows up as a literal stat keyword in description for items
  // that grant it (e.g. Ravenous Hydra, Bloodthirster passive in some seasons).
  if (/omnivamp/i.test(desc)) statTags.add("Omnivamp");

  // Healing (item-active heal that targets allies or self over what
  // lifesteal alone provides). Matches descriptions like "heal nearby allies",
  // "restore health to nearby champions", "heals you and nearby allies".
  if (/heal\s+(?:nearby|allies|allied|yourself|the holder)/i.test(desc) ||
      /restore\s+\d|restore.*health/i.test(desc)) {
    statTags.add("Healing");
  }

  // Shielding (item-active shield application).
  if (/shield\s+(?:nearby|allies|yourself|the holder|allied)/i.test(desc) ||
      /grant.*shield|apply.*shield/i.test(desc)) {
    statTags.add("Shielding");
  }

  return {
    id,
    name: item.name,
    cost,
    isLegendary,
    isBoots,
    isComponent,
    statTags,
    from: [...(item.from ?? [])],
  };
}

/**
 * Compute the effective gold cost to complete `targetId` given an ally
 * already owns `ownedItemIds`. Walks one level of the `from` chain — if
 * an owned item is in `target.from`, its full cost is subtracted.
 *
 * Returns:
 *   - effectiveCost: the gold the ally must still spend
 *   - componentsOwned: the matched component IDs
 *   - savings: ownedComponentsTotal
 *
 * Falls back to `target.cost` when target is unknown or ally owns no
 * relevant components.
 */
export function computeUpgradeCost(targetId: string, ownedItemIds: readonly string[]): {
  effectiveCost: number;
  componentsOwned: string[];
  savings: number;
} {
  const target = getItemTag(targetId);
  if (!target) return { effectiveCost: 0, componentsOwned: [], savings: 0 };
  if (!ownedItemIds || ownedItemIds.length === 0) {
    return { effectiveCost: target.cost, componentsOwned: [], savings: 0 };
  }
  const owned = new Set(ownedItemIds.filter(Boolean));
  const matched: string[] = [];
  let savings = 0;
  for (const componentId of target.from) {
    if (!owned.has(componentId)) continue;
    const comp = getItemTag(componentId);
    if (!comp) continue;
    matched.push(componentId);
    savings += comp.cost;
  }
  // Floor at the upgrade-recipe cost — Riot items don't refund excess
  // when you already own a component combination worth more than the
  // recipe gap. (In practice components are always priced under the
  // legendary cost; this is a guard against bad data.)
  const effectiveCost = Math.max(0, target.cost - savings);
  return { effectiveCost, componentsOwned: matched, savings };
}

/** Test-only: reset the cache. Used by synthetic-Match smoke tests. */
export function __resetItemDbForTesting(): void {
  cached = undefined;
  inflight = undefined;
}
