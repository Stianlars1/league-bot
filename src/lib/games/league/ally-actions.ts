import type { AllyAction, Match, MatchPlan, Participant, Severity } from "../types";
import { getChampMeta, type LeagueChampMeta } from "./data";
import { getItemTag, type StatTag } from "./item-tags";
import { getLayer2BuildPaths } from "./recommender-l2";

/**
 * Map each ally on the team to the ONE item they should rush, plus a
 * follow-up shopping list. The mapping is driven by:
 *   1. The enemy's dominant damage profile (AP / AD)
 *   2. Specific tags in the enemy comp (healing, CC, burst, engage, tanks)
 *   3. The ally's own archetype (squishy carries vs frontline)
 *   4. Live KDA / level / gold per enemy — "top threat" picks favour the
 *      most-fed enemy with the matching tag, not the first one in array order.
 *
 * The recommender produces the "team-wide" advice; this module produces the
 * "what should I personally do RIGHT NOW" advice.
 */

// ============================================================================
// Threat evaluation — pairs static meta with live participant stats so
// downstream rules can prefer the most-fed enemy with a given tag and bump
// severity / rationale strings accordingly. Shared with recommender.ts.
// ============================================================================

export interface Threat {
  meta: LeagueChampMeta;
  participant: Participant;
  /** (kills + assists) / max(1, deaths). 0 when no live stats yet. */
  kdaRatio: number;
  /** Heuristic: positive KDA ratio AND meaningful kill participation. */
  fed: boolean;
  /** Sort key, higher = more dangerous. 0 when no live stats. */
  threatScore: number;
  /** Number of completed legendary items (excludes boots & components).
   *  Layer-1: feeds threat scoring + rule severity. 0 when itemDb not warm. */
  completedItems: number;
  /** Stat-tags present across this enemy's completed items. Empty when
   *  itemDb not warm. */
  itemTags: Set<StatTag>;
}

/**
 * Build a Threat per enemy that has matching meta. Threats without live
 * stats get score 0 — they sort to the bottom but are still emitted so
 * draft-only paths (Spectator-V5) keep working.
 */
export function evaluateThreats(
  enemies: Participant[],
  metas: LeagueChampMeta[],
): Threat[] {
  const byId = new Map(enemies.map((p) => [p.character.id, p]));
  const out: Threat[] = [];
  for (const meta of metas) {
    const participant = byId.get(meta.id);
    if (!participant) continue;

    // Layer-1: derive item profile per enemy. Returns 0 / empty set when
    // item DB hasn't been warmed (Spectator-V5 draft-only path), so the
    // formula degrades to the original KDA+level+gold blend.
    const { completedItems, itemTags } = summarizeItems(participant.items);

    const stats = participant.stats;
    if (!stats) {
      out.push({
        meta,
        participant,
        kdaRatio: 0,
        fed: false,
        threatScore: 0,
        completedItems,
        itemTags,
      });
      continue;
    }
    const ratio = (stats.kills + stats.assists) / Math.max(1, stats.deaths);
    const fed = ratio >= 2.5 && stats.kills + stats.assists >= 5;
    // Blend kill/assist participation, death penalty, and level lead. Gold is
    // an estimate for non-active players in the Live Client path, so we
    // weight it lightly. Item completion gets +2 per legendary because each
    // completed item is a tangible step in the threat curve — a 5/0 enemy
    // with one Pickaxe is much less dangerous than 5/0 with three legendaries.
    const threatScore =
      stats.kills * 3 +
      stats.assists -
      stats.deaths * 2 +
      stats.level / 4 +
      stats.gold / 1500 +
      completedItems * 2;
    out.push({
      meta,
      participant,
      kdaRatio: ratio,
      fed,
      threatScore,
      completedItems,
      itemTags,
    });
  }
  return out;
}

function summarizeItems(items: string[] | undefined): {
  completedItems: number;
  itemTags: Set<StatTag>;
} {
  const itemTags = new Set<StatTag>();
  if (!items || items.length === 0) {
    return { completedItems: 0, itemTags };
  }
  let completedItems = 0;
  for (const id of items) {
    if (!id || id === "0") continue;
    const tag = getItemTag(id);
    if (!tag) continue;
    if (tag.isLegendary) {
      completedItems++;
      for (const t of tag.statTags) itemTags.add(t);
    }
  }
  return { completedItems, itemTags };
}

function prettifyName(id: string) {
  return id.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** "Soraka (4/0/12 — fed), Yuumi (1/2/8)" — KDA appended when stats present. */
export function formatThreats(threats: Threat[], opts: { withKDA?: boolean } = {}): string {
  const sorted = [...threats].sort((a, b) => b.threatScore - a.threatScore);
  return sorted
    .map((t) => {
      const name = prettifyName(t.meta.id);
      if (!opts.withKDA || !t.participant.stats) return name;
      const s = t.participant.stats;
      return `${name} (${s.kills}/${s.deaths}/${s.assists}${t.fed ? " — fed" : ""})`;
    })
    .join(", ");
}

export function anyFed(threats: Threat[]): boolean {
  return threats.some((t) => t.fed);
}

/** Bump severity by one step when `when` is true. low→med→high→critical. */
export function bumpSeverity(severity: Severity, when: boolean): Severity {
  if (!when) return severity;
  if (severity === "low") return "medium";
  if (severity === "medium") return "high";
  return "critical";
}

/** Pick the top-scoring threat from a filtered list, returning its meta. */
function topMetaOf(threats: Threat[]): LeagueChampMeta | undefined {
  if (threats.length === 0) return undefined;
  return threats.reduce((a, b) => (b.threatScore > a.threatScore ? b : a)).meta;
}

// ============================================================================
// Layer-1 item profile: aggregated enemy-team item presence, used by the
// recommender to gate rules on real items rather than just champion tags.
// ============================================================================

/** Real-state aggregate of the enemy team's completed items. Empty when
 *  the item DB hasn't been warmed (Spectator-V5 draft path). */
export interface EnemyItemProfile {
  /** Count of completed items across the enemy team carrying each stat tag. */
  presence: Map<StatTag, number>;
  /** Per-enemy items contributing to team-wide healing / sustain — used by
   *  the antiheal rule to cite which items triggered it. */
  healingItems: { ownerChampionId: string; itemId: string; itemName: string }[];
  /** Total completed legendary items across the enemy team. */
  totalCompletedItems: number;
  /** Total gold cost of every completed enemy item. Approximates "build
   *  maturity" — irrelevant in early game, decisive in late game. */
  totalGoldOnLegendaries: number;
  /** Coarse build-stage label derived from totalCompletedItems / 5 enemies. */
  stage: "early" | "1-item" | "2-item" | "core" | "full";
}

export function buildEnemyItemProfile(enemies: Participant[]): EnemyItemProfile {
  const presence = new Map<StatTag, number>();
  const healingItems: EnemyItemProfile["healingItems"] = [];
  let totalCompletedItems = 0;
  let totalGoldOnLegendaries = 0;

  for (const enemy of enemies) {
    if (!enemy.items) continue;
    for (const id of enemy.items) {
      if (!id || id === "0") continue;
      const tag = getItemTag(id);
      if (!tag || !tag.isLegendary) continue;

      totalCompletedItems++;
      totalGoldOnLegendaries += tag.cost;
      for (const t of tag.statTags) {
        presence.set(t, (presence.get(t) ?? 0) + 1);
      }
      // An enemy item contributes to "team healing" if it's a personal
      // sustain item (Lifesteal/Omnivamp) OR an active heal/shield item
      // (Healing/Shielding tags from description detection).
      if (
        tag.statTags.has("Lifesteal") ||
        tag.statTags.has("Omnivamp") ||
        tag.statTags.has("Healing")
      ) {
        healingItems.push({
          ownerChampionId: enemy.character.id,
          itemId: tag.id,
          itemName: tag.name,
        });
      }
    }
  }

  const avg = enemies.length > 0 ? totalCompletedItems / enemies.length : 0;
  const stage: EnemyItemProfile["stage"] =
    avg < 0.5 ? "early" : avg < 1.5 ? "1-item" : avg < 2.5 ? "2-item" : avg < 3.5 ? "core" : "full";

  return {
    presence,
    healingItems,
    totalCompletedItems,
    totalGoldOnLegendaries,
    stage,
  };
}

/** True when at least one ally already owns an antiheal-applying item.
 *  Lets the recommender suppress duplicate "build antiheal" advice when
 *  the team has already addressed it. */
export function allyHasAntiheal(allies: Participant[]): boolean {
  for (const ally of allies) {
    if (!ally.items) continue;
    for (const id of ally.items) {
      if (!id || id === "0") continue;
      const tag = getItemTag(id);
      if (tag?.statTags.has("AntiHeal")) return true;
    }
  }
  return false;
}

interface EnemyProfile {
  ap: number;
  ad: number;
  healing: number;
  cc: number;
  burst: number;
  engage: number;
  tanks: number;
  shields: number;
  scaling: number;
  apTopThreat?: LeagueChampMeta;
  adTopThreat?: LeagueChampMeta;
  burstThreat?: LeagueChampMeta;
  engageThreat?: LeagueChampMeta;
  healerThreat?: LeagueChampMeta;
  ccThreat?: LeagueChampMeta;
}

function profile(threats: Threat[]): EnemyProfile {
  const p: EnemyProfile = {
    ap: 0, ad: 0, healing: 0, cc: 0, burst: 0, engage: 0, tanks: 0, shields: 0, scaling: 0,
  };
  for (const t of threats) {
    const m = t.meta;
    if (m.damageType === "ap") p.ap++;
    if (m.damageType === "ad") p.ad++;
    if (m.tags.includes("healing")) p.healing++;
    if (m.tags.includes("cc")) p.cc++;
    if (m.tags.includes("burst")) p.burst++;
    if (m.tags.includes("engage")) p.engage++;
    if (m.tags.includes("tank")) p.tanks++;
    if (m.tags.includes("shielding")) p.shields++;
    if (m.tags.includes("scaling")) p.scaling++;
  }
  // Top-threat picks: most-fed enemy with the matching tag, not first-in-list.
  // When no live stats exist (Spectator-V5 path) all threatScores are 0 and
  // ties resolve to the original Map iteration order — same as the old
  // "first match wins" behaviour, so this stays back-compat.
  p.apTopThreat = topMetaOf(threats.filter((t) => t.meta.damageType === "ap"));
  p.adTopThreat = topMetaOf(threats.filter((t) => t.meta.damageType === "ad"));
  p.healerThreat = topMetaOf(threats.filter((t) => t.meta.tags.includes("healing")));
  p.ccThreat = topMetaOf(threats.filter((t) => t.meta.tags.includes("cc")));
  p.burstThreat = topMetaOf(threats.filter((t) => t.meta.tags.includes("burst")));
  p.engageThreat = topMetaOf(threats.filter((t) => t.meta.tags.includes("engage")));
  return p;
}

interface BuildResult {
  priority: { item: string; reason: string };
  followUps: string[];
}

function buildForCarry(p: EnemyProfile, isPhysical: boolean): BuildResult {
  // Carries get focused — defense first
  if (p.cc >= 3) {
    return {
      priority: {
        item: "Mercurial Scimitar (QSS)",
        reason: `${p.cc} reliable lockdowns will delete you without it`,
      },
      followUps: isPhysical
        ? ["Plated Steelcaps", p.healing >= 1 ? "Mortal Reminder" : "Lord Dominik's", "Guardian Angel"]
        : ["Mercury's Treads", p.healing >= 1 ? "Morellonomicon" : "Void Staff", "Zhonya's Hourglass"],
    };
  }
  if (p.burst >= 2) {
    return {
      priority: isPhysical
        ? { item: "Guardian Angel", reason: "Survives the assassin pickoff window" }
        : { item: "Zhonya's Hourglass", reason: "Stasis through the burst combo" },
      followUps: isPhysical
        ? ["Plated Steelcaps", "Edge of Night", p.healing >= 1 ? "Mortal Reminder" : "Lord Dominik's"]
        : ["Sorcerer's Shoes", "Banshee's Veil", p.healing >= 1 ? "Morellonomicon" : "Rabadon's"],
    };
  }
  if (p.ap >= 3 && !isPhysical) {
    return {
      priority: { item: "Banshee's Veil", reason: `${p.ap}/5 deal magic damage at you — block their CC opener` },
      followUps: ["Mercury's Treads", "Zhonya's Hourglass", p.healing >= 1 ? "Morellonomicon" : "Void Staff"],
    };
  }
  if (p.ap >= 3 && isPhysical) {
    return {
      priority: { item: "Mercury's Treads", reason: `${p.ap}/5 deal magic damage at you` },
      followUps: ["Maw of Malmortius", p.healing >= 1 ? "Mortal Reminder" : "Lord Dominik's", "Guardian Angel"],
    };
  }
  if (p.ad >= 3 && isPhysical) {
    return {
      priority: { item: "Plated Steelcaps", reason: `${p.ad}/5 deal physical damage at you` },
      followUps: [p.healing >= 1 ? "Mortal Reminder" : "Lord Dominik's", "Randuin's Omen", "Guardian Angel"],
    };
  }
  if (p.healing >= 1) {
    return {
      priority: {
        item: isPhysical ? "Mortal Reminder" : "Morellonomicon",
        reason: "Cuts their healing in half — non-negotiable",
      },
      followUps: isPhysical ? ["Plated Steelcaps", "Lord Dominik's", "Guardian Angel"] : ["Sorcerer's Shoes", "Void Staff", "Zhonya's Hourglass"],
    };
  }
  return {
    priority: { item: isPhysical ? "Berserker's Greaves" : "Sorcerer's Shoes", reason: "Standard scaling path" },
    followUps: isPhysical ? ["Lord Dominik's", "Bloodthirster", "Guardian Angel"] : ["Rabadon's Deathcap", "Void Staff", "Zhonya's Hourglass"],
  };
}

function buildForFrontline(p: EnemyProfile): BuildResult {
  if (p.tanks >= 2) {
    return {
      priority: { item: "Black Cleaver", reason: `${p.tanks} tanks — armor shred wins teamfights` },
      followUps: ["Plated Steelcaps", p.healing >= 1 ? "Bramble Vest" : "Sterak's Gage", "Death's Dance"],
    };
  }
  if (p.ap >= 3) {
    return {
      priority: { item: "Force of Nature", reason: `${p.ap} sources of magic damage hit your frontline hardest` },
      followUps: ["Mercury's Treads", p.healing >= 1 ? "Bramble Vest" : "Sterak's Gage", "Spirit Visage"],
    };
  }
  if (p.cc >= 3) {
    return {
      priority: { item: "Mercury's Treads", reason: `${p.cc} hard CC sources — tenacity matters` },
      followUps: ["Sterak's Gage", p.healing >= 1 ? "Bramble Vest" : "Death's Dance", "Maw of Malmortius"],
    };
  }
  return {
    priority: { item: "Plated Steelcaps", reason: "Standard frontline build path" },
    followUps: ["Sterak's Gage", "Death's Dance", "Guardian Angel"],
  };
}

function buildForSupport(p: EnemyProfile): BuildResult {
  if (p.engage >= 2 || p.cc >= 3) {
    return {
      priority: { item: "Mikael's Blessing", reason: "Cleanses ally CC — wins the engage trade" },
      followUps: ["Mercury's Treads", "Locket of the Iron Solari", p.ap >= 3 ? "Vigilant Wardstone" : "Knight's Vow"],
    };
  }
  if (p.healing >= 1) {
    return {
      priority: { item: "Chemtech Putrifier", reason: "Antiheal in your support slot frees your carry's build" },
      followUps: ["Mercury's Treads", "Locket of the Iron Solari", "Mikael's Blessing"],
    };
  }
  return {
    priority: { item: "Locket of the Iron Solari", reason: "Standard team-shielding path" },
    followUps: ["Mercury's Treads", "Mikael's Blessing", "Vigilant Wardstone"],
  };
}

function buildForJungler(p: EnemyProfile): BuildResult {
  if (p.cc >= 3) {
    return {
      priority: { item: "Mercury's Treads", reason: `Tenacity vs ${p.cc} CC sources` },
      followUps: ["Sterak's Gage", "Death's Dance", p.healing >= 1 ? "Bramble Vest" : "Force of Nature"],
    };
  }
  if (p.scaling >= 2) {
    return {
      priority: { item: "Mosstomper / Gustwalker (early ganks)", reason: `Their comp scales — pressure now` },
      followUps: ["Plated Steelcaps", "Black Cleaver", "Sterak's Gage"],
    };
  }
  return {
    priority: { item: "Plated Steelcaps", reason: "Pressure with armor" },
    followUps: ["Sterak's Gage", "Death's Dance", "Maw of Malmortius"],
  };
}

function pickWatchOut(allyMeta: LeagueChampMeta | undefined, p: EnemyProfile, threats: Threat[]): AllyAction["watchOut"] | undefined {
  if (!allyMeta) return undefined;

  const archetype = allyMeta.archetype;
  const squishy = ["mage", "marksman", "support", "assassin"].includes(archetype);
  const dueler = ["skirmisher", "fighter"].includes(archetype);
  const frontline = ["tank", "juggernaut"].includes(archetype);

  // Squishy carries fear pickoff first
  if (squishy && p.burstThreat) {
    return {
      championId: p.burstThreat.id,
      championName: prettifyName(p.burstThreat.id),
      reason: "Will dive your backline — track their flash",
    };
  }
  if (squishy && p.engageThreat) {
    return {
      championId: p.engageThreat.id,
      championName: prettifyName(p.engageThreat.id),
      reason: "Hard engage threat — don't stand alone",
    };
  }

  // Skirmishers/duelists fear hard CC during their kiting window
  if (dueler && p.ccThreat) {
    return {
      championId: p.ccThreat.id,
      championName: prettifyName(p.ccThreat.id),
      reason: "Will lock you down mid-fight — sidestep their CC",
    };
  }
  if (dueler && p.burstThreat) {
    return {
      championId: p.burstThreat.id,
      championName: prettifyName(p.burstThreat.id),
      reason: "Burst window kills you before you can duel",
    };
  }

  // Frontline cares about chain CC
  if (frontline && p.ccThreat) {
    return {
      championId: p.ccThreat.id,
      championName: prettifyName(p.ccThreat.id),
      reason: "Lockdown chains — bait their CC before engaging",
    };
  }
  if (frontline && p.engageThreat && p.engageThreat.id !== allyMeta.id) {
    return {
      championId: p.engageThreat.id,
      championName: prettifyName(p.engageThreat.id),
      reason: "Counter-engage threat — fight on your terms",
    };
  }

  // Last resorts
  if (p.engageThreat) {
    return {
      championId: p.engageThreat.id,
      championName: prettifyName(p.engageThreat.id),
      reason: "Hard engage threat — keep distance",
    };
  }
  if (p.healerThreat) {
    return {
      championId: p.healerThreat.id,
      championName: prettifyName(p.healerThreat.id),
      reason: "Their sustain anchor — kill or peel them off",
    };
  }
  const top = topMetaOf(threats);
  if (top) {
    return {
      championId: top.id,
      championName: prettifyName(top.id),
      reason: "Highest-impact enemy on the board",
    };
  }
  return undefined;
}

export function getAllyActions(match: Match): AllyAction[] {
  const allies = match.teams[0].participants;
  const enemies = match.teams[1].participants;
  const enemyMetas = enemies
    .map((p) => getChampMeta(p.character.id))
    .filter((m): m is LeagueChampMeta => Boolean(m));

  const threats = evaluateThreats(enemies, enemyMetas);
  const p = profile(threats);

  // Layer-2: per-ally curated build paths (allies without curated entries
  // are absent from the map — those keep layer-1 advice only).
  const layer2 = getLayer2BuildPaths(match);

  return allies.map((ally) => {
    const meta = getChampMeta(ally.character.id);
    const archetype = meta?.archetype ?? ally.character.archetype ?? "fighter";
    const isPhysical = (meta?.damageType ?? ally.character.damageType) === "ad";

    let build: BuildResult;
    if (archetype === "marksman" || archetype === "mage" || archetype === "assassin") {
      build = buildForCarry(p, isPhysical);
    } else if (archetype === "support") {
      build = buildForSupport(p);
    } else if (ally.position === "JUNGLE" || archetype === "skirmisher") {
      build = buildForJungler(p);
    } else {
      build = buildForFrontline(p);
    }

    const buildPath = layer2.get(ally.character.id);

    return {
      championId: ally.character.id,
      championName: ally.character.name,
      position: ally.position,
      archetype,
      damageType: meta?.damageType ?? ally.character.damageType,
      imageUrl: ally.character.imageUrl,
      priority: build.priority,
      followUps: build.followUps,
      watchOut: pickWatchOut(meta, p, threats),
      // Layer-2 buildPath (curated, cited). Empty when champion isn't
      // curated yet; layer-1 priority/followUps always present as fallback.
      ...(buildPath && buildPath.length > 0 ? { buildPath } : {}),
    } satisfies AllyAction;
  });
}

export function getMatchPlan(match: Match): MatchPlan {
  const enemies = match.teams[1].participants;
  const enemyMetas = enemies
    .map((p) => getChampMeta(p.character.id))
    .filter((m): m is LeagueChampMeta => Boolean(m));
  const threats = evaluateThreats(enemies, enemyMetas);
  const p = profile(threats);

  // Identify dominant traits for the headline
  const traits: string[] = [];
  if (p.ap >= 3) traits.push("AP-heavy");
  if (p.ad >= 3) traits.push("AD-heavy");
  if (p.healing >= 2) traits.push("sustain comp");
  else if (p.healing >= 1) traits.push("with healing");
  if (p.tanks >= 2) traits.push("tanky frontline");
  if (p.engage >= 2) traits.push("hard engage");
  if (p.burst >= 2) traits.push("burst threat");
  if (p.scaling >= 2) traits.push("scaling carries");
  if (p.cc >= 3) traits.push("CC chain");
  const enemyArchetype = traits.length > 0 ? traits.slice(0, 3).join(" · ") : "Standard composition";

  // Top actions
  const topActions: MatchPlan["topActions"] = [];
  if (p.ap >= 3) {
    topActions.push({
      title: "Stack Magic Resist",
      detail: `${p.ap}/5 deal magic damage. Mercury's Treads on most, Hexdrinker/Banshee's on carries.`,
    });
  } else if (p.ad >= 3) {
    topActions.push({
      title: "Stack Armor",
      detail: `${p.ad}/5 deal physical damage. Plated Steelcaps + Frozen Heart/Randuin's.`,
    });
  }
  if (p.healing >= 1) {
    topActions.push({
      title: "Antiheal is non-negotiable",
      detail: "Executioner's at first back, full Mortal Reminder/Morellonomicon by mid-game.",
    });
  }
  if (p.cc >= 3) {
    topActions.push({
      title: "Plan around CC chains",
      detail: "QSS on focused carries, tenacity on frontline, Cleanse on whoever lacks mobility.",
    });
  } else if (p.engage >= 2) {
    topActions.push({
      title: "Don't get caught",
      detail: "Pink ward before objectives, hold flash, never facecheck post-minute-4.",
    });
  } else if (p.scaling >= 2) {
    topActions.push({
      title: "End by minute 30",
      detail: "Force every objective. Their power curve outscales yours late.",
    });
  } else if (p.burst >= 2) {
    topActions.push({
      title: "Survive their pickoff window",
      detail: "Stopwatch on key targets. Don't ARAM mid-river.",
    });
  } else {
    topActions.push({
      title: "Standard pacing",
      detail: "No screaming weakness — play for objectives, win matchups.",
    });
  }

  const counterStrategy =
    p.healing >= 1 && p.ap >= 3
      ? "Burst them down before their healers stabilize. MR + antiheal isn't optional."
      : p.engage >= 2 && p.cc >= 3
        ? "Stay split, dodge their setup, then collapse on isolated targets."
        : p.scaling >= 2
          ? "Force fights every minute. Don't trade for late-game value."
          : p.ap >= 3
            ? "MR carries, focus their main mage, then siege."
            : p.ad >= 3
              ? "Armor + peel for carries. Their physical dive falls apart with one cleanse."
              : "Win matchups, pick objectives, snowball your strongest lane.";

  return {
    enemyArchetype,
    counterStrategy,
    topActions: topActions.slice(0, 3),
  };
}
