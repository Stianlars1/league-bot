/**
 * Layer-2 recommender — curated counter-graph + per-champion knowledge.
 *
 * Per-ally pipeline:
 *   1. Look up CuratedChampion for the ally. If absent, return null
 *      (layer-1's priority/followUps stay as the visible advice).
 *   2. For each enemy, derive threat types from:
 *        a. Their CuratedChampion intrinsic types (if curated), or
 *        b. Their LeagueChampMeta tags (fallback)
 *      and refine by item signals (Liandry → AP-DoT, Lich Bane → AP-burst).
 *   3. Tally weighted threat-type counts across the enemy team. Item
 *      signals get extra weight (real items > intrinsic potential).
 *   4. For top 1-2 dominant threat types, look up COUNTER_GRAPH and
 *      filter by ally archetype compatibility (don't recommend AD antiheal
 *      to an AP mage; we use the AP variant).
 *   5. Emit ordered BuildStep[] with citations.
 *
 * Layer-2 NEVER overrides layer-1 — the Recommendation[] from layer-1
 * stays untouched. Layer-2 only adds AllyAction.buildPath, which the UI
 * can show alongside the layer-1 priority/followUps.
 */

import type { BuildStep, Match, ThreatType } from "../types";
import { evaluateThreats, type Threat } from "./ally-actions";
import { getChampMeta, type LeagueChampMeta } from "./data";
import { CURATED_CHAMPIONS, getCuratedChampion } from "./data/champions-curated";
import { COUNTER_GRAPH, type CounterEntry, type CounterGraphEntry } from "./data/counter-graph";
import { signalsFromItems } from "./data/items-curated";
import { computeUpgradeCost, getItemTag, type ItemTag } from "./item-tags";

/** Minimal "AD or AP" classifier for ally archetype-aware filtering.
 *  Marksman/skirmisher = AD-flavor; mage/most-supports = AP-flavor;
 *  bruisers vary — read the meta. */
type AllyDamageFlavor = "AD" | "AP" | "either";

function flavorForAlly(meta: LeagueChampMeta | undefined, fallback: string | undefined): AllyDamageFlavor {
  const dt = meta?.damageType ?? fallback;
  if (dt === "ap") return "AP";
  if (dt === "ad") return "AD";
  return "either";
}

/** Mapping from antiheal threat → preferred item per damage flavor. AD
 *  champs want Mortal Reminder; AP champs want Morellonomicon; bruisers
 *  who can't slot pure carry items get Chempunk Chainsword. Citations live
 *  in counter-graph.ts; this map just routes to the right item. */
const ANTIHEAL_BY_FLAVOR: Record<AllyDamageFlavor, string> = {
  AD: "3033", // Mortal Reminder
  AP: "3165", // Morellonomicon
  either: "3033", // Default to AD when ambiguous; UI shows alternatives
};

/** Aggregate enemy threats with item-signal refinement.
 *  Returns a Map<ThreatType, weight> sorted descending by weight. */
function aggregateEnemyThreats(threats: Threat[]): Map<ThreatType, number> {
  const counts = new Map<ThreatType, number>();
  const bump = (t: ThreatType, w: number) => counts.set(t, (counts.get(t) ?? 0) + w);

  for (const threat of threats) {
    // Intrinsic threat type from curated entry (preferred, refined) or
    // best-effort from champion-meta tags + damage type (fallback).
    const curated = getCuratedChampion(threat.meta.id);
    if (curated) {
      for (const t of curated.intrinsicThreatTypes) bump(t, 1);
    } else {
      // Fallback heuristic from existing champion meta — coarse.
      if (threat.meta.tags.includes("burst")) {
        bump(threat.meta.damageType === "ap" ? "AP-burst" : "AD-burst", 1);
      }
      if (threat.meta.tags.includes("healing")) bump("Healing", 1);
      if (threat.meta.tags.includes("tank")) bump("Tank", 1);
      if (threat.meta.tags.includes("cc")) bump("CC-chain", 1);
      if (threat.meta.tags.includes("engage")) bump("Engage", 1);
      if (threat.meta.tags.includes("poke")) bump("Poke", 1);
      if (threat.meta.tags.includes("shielding")) bump("Shielding", 1);
    }

    // Item-signal refinement: real items refine intrinsic threats. A
    // burst-tagged AP champ who built Liandry is actually an AP-DoT
    // threat, not AP-burst — the signal trumps the kit-based assumption.
    // Item signals are weighted heavier (2x) because they're empirical.
    if (threat.participant.items && threat.participant.items.length > 0) {
      const signals = signalsFromItems(threat.participant.items);
      for (const sig of signals) bump(sig, 2);
    }
  }

  // Sort by weight desc, return as Map preserving order.
  return new Map([...counts.entries()].sort((a, b) => b[1] - a[1]));
}

/** Pick a counter item from a graph entry, applying ally-flavor routing.
 *  For Healing threats, returns Mortal Reminder/Morellonomicon based on
 *  ally damage flavor; for others returns the highest-priority item. */
function pickCounterForFlavor(
  entry: CounterGraphEntry,
  flavor: AllyDamageFlavor,
): CounterEntry | undefined {
  if (entry.threatType === "Healing") {
    // Antiheal flavors are pre-routed via ANTIHEAL_BY_FLAVOR; find the
    // matching counter entry (or fall back to highest priority).
    const preferredId = ANTIHEAL_BY_FLAVOR[flavor];
    const matched = entry.items.find((i) => i.itemId === preferredId);
    if (matched) return matched;
  }
  return [...entry.items].sort((a, b) => a.priority - b.priority)[0];
}

/** Convert a CounterEntry + ItemTag into a BuildStep. Returns null when
 *  the item DB hasn't classified the item (we can't fill cost / name).
 *  Computes upgrade cost when the ally already owns sub-components. */
function counterEntryToBuildStep(counter: CounterEntry, allyOwnedItems: Set<string>): BuildStep | null {
  const tag: ItemTag | undefined = getItemTag(counter.itemId);
  if (!tag) return null; // Item DB cold or item filtered (rare)

  const owned = [...allyOwnedItems];
  const upgrade = computeUpgradeCost(counter.itemId, owned);

  return {
    itemId: counter.itemId,
    itemName: tag.name,
    reason: counter.reason,
    // `cost` reflects what the ally must STILL spend — full price when no
    // components are owned, upgrade-only when components are owned.
    cost: upgrade.effectiveCost,
    componentsOwned: upgrade.componentsOwned.length > 0 ? upgrade.componentsOwned : undefined,
    confidence: "curated",
    cite: counter.cite,
  };
}

/**
 * Layer-2 entry point. Returns a Map<allyChampionId, BuildStep[]> for the
 * allies that have curated entries. Allies without curated entries are
 * absent from the returned map — the caller (getAllyActions in
 * ally-actions.ts) keeps layer-1's priority/followUps for those.
 */
export function getLayer2BuildPaths(match: Match): Map<string, BuildStep[]> {
  const result = new Map<string, BuildStep[]>();
  const enemies = match.teams[1].participants;
  const allies = match.teams[0].participants;

  // Build enemy threat aggregate once.
  const enemyMetas: LeagueChampMeta[] = enemies
    .map((p) => getChampMeta(p.character.id))
    .filter((m): m is LeagueChampMeta => Boolean(m));
  const threats = evaluateThreats(enemies, enemyMetas);
  const aggregated = aggregateEnemyThreats(threats);

  if (aggregated.size === 0) return result; // No threats classified

  // Top 2 dominant threat types
  const topThreats = [...aggregated.keys()].slice(0, 2);

  for (const ally of allies) {
    const curated = getCuratedChampion(ally.character.id);
    if (!curated) continue; // Layer-2 only fires for curated champions

    const allyMeta = getChampMeta(ally.character.id);
    const flavor = flavorForAlly(allyMeta, ally.character.damageType);
    const owned = new Set(ally.items ?? []);

    const steps: BuildStep[] = [];
    const seen = new Set<string>();

    for (const threatType of topThreats) {
      const entry = COUNTER_GRAPH[threatType];
      if (!entry || entry.items.length === 0) continue;

      const picked = pickCounterForFlavor(entry, flavor);
      if (!picked) continue;
      if (seen.has(picked.itemId)) continue; // Don't duplicate items
      if (owned.has(picked.itemId)) continue; // Already built

      const step = counterEntryToBuildStep(picked, owned);
      if (step) {
        steps.push(step);
        seen.add(picked.itemId);
      }
    }

    // Add the champion's curated counters too — items that hit THIS specific
    // enemy's kit, not the team-wide threat profile. Walked off the enemy's
    // CuratedChampion.counteredBy list — items that hurt THEM when WE build
    // them. Component awareness applied here too.
    const ownedArr = [...owned];
    for (const enemy of enemies) {
      const enemyCurated = getCuratedChampion(enemy.character.id);
      if (!enemyCurated) continue;
      for (const counter of enemyCurated.counteredBy) {
        if (seen.has(counter.itemId)) continue;
        if (owned.has(counter.itemId)) continue;
        const tag = getItemTag(counter.itemId);
        if (!tag) continue;
        const upgrade = computeUpgradeCost(counter.itemId, ownedArr);
        steps.push({
          itemId: counter.itemId,
          itemName: tag.name,
          reason: `vs ${enemyCurated.name}: ${counter.reason}`,
          cost: upgrade.effectiveCost,
          componentsOwned: upgrade.componentsOwned.length > 0 ? upgrade.componentsOwned : undefined,
          confidence: "curated",
          cite: counter.cite,
        });
        seen.add(counter.itemId);
        if (steps.length >= 4) break; // Cap output
      }
      if (steps.length >= 4) break;
    }

    if (steps.length > 0) {
      // Cap to top 3 BuildSteps — the UI shows ~3 next-buy slots.
      result.set(ally.character.id, steps.slice(0, 3));
    }
  }

  return result;
}

/** Diagnostic: how many allies in the match have curated entries.
 *  Used by recommender.ts to decide whether to advertise layer-2 in
 *  the response or stay silent. */
export function curatedCoverage(match: Match): { allies: number; total: number } {
  const allies = match.teams[0].participants;
  const covered = allies.filter((a) => a.character.id in CURATED_CHAMPIONS).length;
  return { allies: covered, total: allies.length };
}
