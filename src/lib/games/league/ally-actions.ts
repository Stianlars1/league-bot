import type { AllyAction, Match, MatchPlan } from "../types";
import { getChampMeta, type LeagueChampMeta } from "./data";

/**
 * Map each ally on the team to the ONE item they should rush, plus a
 * follow-up shopping list. The mapping is driven by:
 *   1. The enemy's dominant damage profile (AP / AD)
 *   2. Specific tags in the enemy comp (healing, CC, burst, engage, tanks)
 *   3. The ally's own archetype (squishy carries vs frontline)
 *
 * The recommender produces the "team-wide" advice; this module produces the
 * "what should I personally do RIGHT NOW" advice.
 */

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

function profile(enemy: LeagueChampMeta[]): EnemyProfile {
  const p: EnemyProfile = {
    ap: 0, ad: 0, healing: 0, cc: 0, burst: 0, engage: 0, tanks: 0, shields: 0, scaling: 0,
  };
  for (const m of enemy) {
    if (m.damageType === "ap") {
      p.ap++;
      if (!p.apTopThreat) p.apTopThreat = m;
    }
    if (m.damageType === "ad") {
      p.ad++;
      if (!p.adTopThreat) p.adTopThreat = m;
    }
    if (m.tags.includes("healing")) {
      p.healing++;
      if (!p.healerThreat) p.healerThreat = m;
    }
    if (m.tags.includes("cc")) {
      p.cc++;
      if (!p.ccThreat) p.ccThreat = m;
    }
    if (m.tags.includes("burst")) {
      p.burst++;
      if (!p.burstThreat) p.burstThreat = m;
    }
    if (m.tags.includes("engage")) {
      p.engage++;
      if (!p.engageThreat) p.engageThreat = m;
    }
    if (m.tags.includes("tank")) p.tanks++;
    if (m.tags.includes("shielding")) p.shields++;
    if (m.tags.includes("scaling")) p.scaling++;
  }
  return p;
}

function prettifyName(id: string) {
  return id.replace(/([a-z])([A-Z])/g, "$1 $2");
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
      priority: { item: "Hexdrinker → Maw of Malmortius", reason: `${p.ap}/5 deal magic damage at you` },
      followUps: ["Mercury's Treads", "Banshee's Veil", p.healing >= 1 ? "Morellonomicon" : "Void Staff"],
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

function pickWatchOut(allyMeta: LeagueChampMeta | undefined, p: EnemyProfile, enemy: LeagueChampMeta[]): AllyAction["watchOut"] | undefined {
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
  const top = enemy[0];
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
  const enemyMetas = match.teams[1].participants
    .map((p) => getChampMeta(p.character.id))
    .filter((m): m is LeagueChampMeta => Boolean(m));

  const p = profile(enemyMetas);

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

    return {
      championId: ally.character.id,
      championName: ally.character.name,
      position: ally.position,
      archetype,
      damageType: meta?.damageType ?? ally.character.damageType,
      imageUrl: ally.character.imageUrl,
      priority: build.priority,
      followUps: build.followUps,
      watchOut: pickWatchOut(meta, p, enemyMetas),
    } satisfies AllyAction;
  });
}

export function getMatchPlan(match: Match): MatchPlan {
  const enemyMetas = match.teams[1].participants
    .map((p) => getChampMeta(p.character.id))
    .filter((m): m is LeagueChampMeta => Boolean(m));
  const p = profile(enemyMetas);

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
