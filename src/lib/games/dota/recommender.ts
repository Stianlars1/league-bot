import type { Recommender } from "../adapter";
import type { Match, Recommendation } from "../types";
import { getHeroMeta, type DotaHeroMeta } from "./data";

function metaFor(id: string): DotaHeroMeta | undefined {
  return getHeroMeta(id);
}

function tally(metas: DotaHeroMeta[]) {
  let physical = 0,
    magical = 0,
    hybrid = 0;
  const tagsCount = new Map<string, number>();
  for (const m of metas) {
    if (m.damageType === "physical") physical++;
    else if (m.damageType === "magical") magical++;
    else hybrid++;
    for (const t of m.tags) tagsCount.set(t, (tagsCount.get(t) ?? 0) + 1);
  }
  return { physical, magical, hybrid, tagsCount };
}

function namesFor(metas: DotaHeroMeta[], predicate: (m: DotaHeroMeta) => boolean): string[] {
  return metas.filter(predicate).map((m) => m.name);
}

export const dotaRecommender: Recommender = {
  recommend(match: Match): Recommendation[] {
    const enemies = match.teams[1].participants;
    const enemyMetas: DotaHeroMeta[] = enemies
      .map((p) => metaFor(p.character.id))
      .filter((m): m is DotaHeroMeta => Boolean(m));

    if (enemyMetas.length === 0) {
      return [
        {
          id: "fallback:no-meta",
          category: "strategy",
          severity: "low",
          title: "Limited data on this enemy lineup",
          body: "We don't have curated metadata for these heroes. Check matchups manually.",
        },
      ];
    }

    const { physical, magical, tagsCount } = tally(enemyMetas);
    const recs: Recommendation[] = [];

    // ---- Damage profile ----
    if (magical >= 3) {
      recs.push({
        id: "rule:magical-heavy",
        category: "defensive-item",
        severity: magical >= 4 ? "critical" : "high",
        title: `Build magic resistance — ${magical}/${enemyMetas.length} are magical`,
        body:
          "Pipe of Insight on cores. Glimmer Cape on supports. " +
          "Eternal Shroud is great vs sustained magical (Zeus, Necro). " +
          "Lotus Orb if they also have heavy single-target initiation.",
        rationale: `Magical threats: ${namesFor(enemyMetas, (m) => m.damageType === "magical").join(", ")}.`,
      });
    }
    if (physical >= 3) {
      recs.push({
        id: "rule:physical-heavy",
        category: "defensive-item",
        severity: physical >= 4 ? "critical" : "high",
        title: `Stack armor — ${physical}/${enemyMetas.length} deal physical`,
        body:
          "Crimson Guard from offlane. Solar Crest, Shiva's, Assault Cuirass on cores. " +
          "Ghost Scepter on squishy heroes when their carry pops off.",
        rationale: `Physical threats: ${namesFor(enemyMetas, (m) => m.damageType === "physical").join(", ")}.`,
      });
    }

    // ---- Healing → Spirit Vessel / Eternal Shroud ----
    const healing = tagsCount.get("healing") ?? 0;
    if (healing >= 1) {
      const healers = namesFor(enemyMetas, (m) => m.tags.includes("healing")).join(", ");
      recs.push({
        id: "rule:antiheal",
        category: "offensive-item",
        severity: healing >= 2 ? "critical" : "high",
        title: `Buy Spirit Vessel`,
        body:
          "Vessel reduces HP regen and burns max HP — vital vs Huskar/WK/Necro. " +
          "Ancient Apparition's ult also blocks heals if you can pick them up.",
        rationale: `Healing threats: ${healers}.`,
      });
    }

    // ---- Stuns → BKB ----
    const stuns = tagsCount.get("stuns") ?? 0;
    if (stuns >= 3) {
      const stunNames = namesFor(enemyMetas, (m) => m.tags.includes("stuns")).join(", ");
      recs.push({
        id: "rule:stun-heavy",
        category: "defensive-item",
        severity: stuns >= 4 ? "critical" : "high",
        title: `Black King Bar is mandatory`,
        body:
          "Cores rush BKB. Manta Style as secondary dispel. " +
          "Linken's Sphere on heroes targeted by single-target stuns.",
        rationale: `Stun sources: ${stunNames}.`,
      });
    }

    // ---- Silences → Lotus / Eul's ----
    const silences = tagsCount.get("silences") ?? 0;
    if (silences >= 2) {
      const silenceNames = namesFor(enemyMetas, (m) => m.tags.includes("silences")).join(", ");
      recs.push({
        id: "rule:silence-heavy",
        category: "defensive-item",
        severity: "high",
        title: `Counter their silences`,
        body:
          "Lotus Orb on initiator targets. Eul's Scepter for self-dispel. " +
          "Manta Style breaks silences. Don't blow BKB just for the silence — save for fight.",
        rationale: `Silence sources: ${silenceNames}.`,
      });
    }

    // ---- Engage / initiation ----
    const engage = tagsCount.get("engage") ?? 0;
    if (engage >= 2) {
      const engageNames = namesFor(enemyMetas, (m) => m.tags.includes("engage")).join(", ");
      recs.push({
        id: "rule:engage",
        category: "strategy",
        severity: engage >= 3 ? "high" : "medium",
        title: `Respect their initiation windows`,
        body:
          "Stay split until their initiation cooldowns are blown. " +
          "Smoke is dangerous — buy Sentries and Gem aggressively. " +
          "Force Staff / Hurricane Pike on cores to escape engages.",
        rationale: `Initiators: ${engageNames}.`,
      });
    }

    // ---- Burst combos ----
    const burst = tagsCount.get("burst") ?? 0;
    if (burst >= 2) {
      recs.push({
        id: "rule:burst",
        category: "defensive-item",
        severity: burst >= 3 ? "high" : "medium",
        title: `Avoid getting comboed`,
        body:
          "Pipe + BKB on cores at risk. Glimmer Cape on supports. " +
          "Aeon Disk for the squishy carry that always gets focused. " +
          "Linken's where applicable.",
      });
    }

    // ---- Tank stack → break / armor pen ----
    const tank = tagsCount.get("tank") ?? 0;
    if (tank >= 2) {
      recs.push({
        id: "rule:tank-heavy",
        category: "offensive-item",
        severity: "medium",
        title: `Cut through their frontline`,
        body:
          "Diffusal Blade dispels passives and saves. " +
          "Desolator + Assault Cuirass shred armor. " +
          "Bloodthorn for crit. Skadi to kite + slow regen.",
      });
    }

    // ---- Illusion army → AoE / Battle Fury ----
    const illusion = tagsCount.get("illusion") ?? 0;
    if (illusion >= 1) {
      const illusionNames = namesFor(enemyMetas, (m) => m.tags.includes("illusion")).join(", ");
      recs.push({
        id: "rule:illusion",
        category: "offensive-item",
        severity: illusion >= 2 ? "high" : "medium",
        title: `Counter illusion lineups`,
        body:
          "AoE damage clears illusions: Mjolnir, Battle Fury, Crystalys, Radiance. " +
          "Maelstrom on right-clickers. " +
          "Shiva's Guard slows + AoE.",
        rationale: `Illusion threats: ${illusionNames}.`,
      });
    }

    // ---- Evasion → MKB ----
    const evasion = tagsCount.get("evasion") ?? 0;
    if (evasion >= 1) {
      recs.push({
        id: "rule:evasion",
        category: "offensive-item",
        severity: "high",
        title: `Buy Monkey King Bar`,
        body:
          "MKB on right-click cores pierces evasion. " +
          "Bloodthorn provides true strike + silence. " +
          "Don't try to right-click PA without it.",
      });
    }

    // ---- Splitpush / late game ----
    const split = tagsCount.get("split") ?? 0;
    if (split >= 1) {
      recs.push({
        id: "rule:split",
        category: "strategy",
        severity: "medium",
        title: `Defend against splitpush`,
        body:
          "Buy back-up TPs. Glyph cooldown awareness. " +
          "Smoke gank the splitpusher when they push too far.",
      });
    }

    // ---- Sort and return ----
    const sevRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    recs.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);
    return recs;
  },
};
