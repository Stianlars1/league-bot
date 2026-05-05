import type { Recommender } from "../adapter";
import type { Match, Recommendation } from "../types";
import {
  anyFed,
  bumpSeverity,
  evaluateThreats,
  formatThreats,
  getAllyActions,
  getMatchPlan,
  type Threat,
} from "./ally-actions";
import { getChampMeta, type LeagueChampMeta } from "./data";
import { computeMatchIntel } from "./intel";

/**
 * Rules-based draft coach for LoL. Reads enemy team comp from the normalized
 * Match and emits prioritized Recommendation entries.
 *
 * As of the air-tightness pass, rules also read live participant stats:
 *   - rationale strings cite each named threat's KDA (and " — fed" marker)
 *   - severity bumps one step when any matched threat is fed
 *   - rules degrade to plain champion-name rationales when stats are absent
 *     (Spectator-V5 path, draft-only frames)
 */

function metaFor(championId: string): LeagueChampMeta | undefined {
  return getChampMeta(championId);
}

function tally(metas: LeagueChampMeta[]) {
  let ad = 0,
    ap = 0,
    hybrid = 0;
  const tagsCount = new Map<string, number>();
  for (const m of metas) {
    if (m.damageType === "ad") ad++;
    else if (m.damageType === "ap") ap++;
    else hybrid++;
    for (const t of m.tags) tagsCount.set(t, (tagsCount.get(t) ?? 0) + 1);
  }
  return { ad, ap, hybrid, tagsCount };
}

function fallbackName(id: string) {
  // Prettify camelCase IDs like "MissFortune" → "Miss Fortune"
  return id.replace(/([a-z])([A-Z])/g, "$1 $2");
}

/** Filter threats by predicate over the meta. */
function threatsBy(threats: Threat[], pred: (m: LeagueChampMeta) => boolean): Threat[] {
  return threats.filter((t) => pred(t.meta));
}

export const leagueRecommender: Recommender = {
  allyActions: (match: Match) => getAllyActions(match),
  plan: (match: Match) => getMatchPlan(match),
  intel: (match: Match) => computeMatchIntel(match),

  recommend(match: Match): Recommendation[] {
    const enemies = match.teams[1].participants;
    const allies = match.teams[0].participants;

    const enemyMetas: LeagueChampMeta[] = enemies
      .map((p) => metaFor(p.character.id))
      .filter((m): m is LeagueChampMeta => Boolean(m));

    const recs: Recommendation[] = [];

    if (enemyMetas.length === 0) {
      // We don't have meta for any enemy champ — emit a soft hint.
      recs.push({
        id: "fallback:no-meta",
        category: "strategy",
        severity: "low",
        title: "Limited data on this enemy comp",
        body: "We don't have curated metadata for these champions yet. Check matchups manually.",
      });
      return recs;
    }

    const threats = evaluateThreats(enemies, enemyMetas);
    const { ad, ap, tagsCount } = tally(enemyMetas);
    const total = enemyMetas.length;

    // ---- Damage profile ----
    if (ap >= 3) {
      const apThreats = threatsBy(threats, (m) => m.damageType === "ap");
      recs.push({
        id: "rule:ap-heavy",
        category: "defensive-item",
        severity: bumpSeverity(ap >= 4 ? "critical" : "high", anyFed(apThreats)),
        title: `Stack Magic Resist — ${ap}/${total} enemies deal magic damage`,
        body:
          "Hexdrinker → Maw of Malmortius for AD/skirmishers. Mercury's Treads on most. " +
          "Force of Nature on tanks. Wit's End on attack-speed champs.",
        rationale: `Enemy AP threats: ${formatThreats(apThreats, { withKDA: true })}.`,
      });
    }
    if (ad >= 3) {
      const adThreats = threatsBy(threats, (m) => m.damageType === "ad");
      recs.push({
        id: "rule:ad-heavy",
        category: "defensive-item",
        severity: bumpSeverity(ad >= 4 ? "critical" : "high", anyFed(adThreats)),
        title: `Stack Armor — ${ad}/${total} enemies deal physical damage`,
        body:
          "Plated Steelcaps for ranged-AD-heavy comps. Tabis on most. " +
          "Frozen Heart vs auto-attackers, Randuin's vs crit. " +
          "Thornmail if you also need anti-heal.",
        rationale: `Enemy AD threats: ${formatThreats(adThreats, { withKDA: true })}.`,
      });
    }

    // ---- Healing/sustain → Grievous Wounds ----
    const healing = tagsCount.get("healing") ?? 0;
    if (healing >= 1) {
      const healers = threatsBy(threats, (m) => m.tags.includes("healing"));
      recs.push({
        id: "rule:antiheal",
        category: "offensive-item",
        severity: bumpSeverity(healing >= 2 ? "critical" : "high", anyFed(healers)),
        title: `Buy Grievous Wounds early`,
        body:
          "Executioner's Calling / Bramble Vest at first back. " +
          "Mortal Reminder for ADCs, Morellonomicon for mages, Chempunk for bruisers. " +
          "Don't skip — sustain compounds without antiheal.",
        rationale: `Healing threats: ${formatThreats(healers, { withKDA: true })}.`,
      });
    }

    // ---- Hard CC → QSS / Mercury ----
    const cc = tagsCount.get("cc") ?? 0;
    if (cc >= 3) {
      const ccThreats = threatsBy(threats, (m) => m.tags.includes("cc"));
      recs.push({
        id: "rule:cc-heavy",
        category: "defensive-item",
        severity: bumpSeverity(cc >= 4 ? "critical" : "high", anyFed(ccThreats)),
        title: `Plan around heavy CC — ${cc} reliable lockdowns`,
        body:
          "Mercury's Treads default. Quicksilver Sash on carries that get focused. " +
          "Cleanse summoner if you're squishy and lack mobility. " +
          "Stack tenacity (Sterak's, Unflinching, Legend: Tenacity).",
        rationale: `CC sources: ${formatThreats(ccThreats, { withKDA: true })}.`,
      });
    }

    // ---- Burst / dive → Zhonya / GA ----
    const burst = tagsCount.get("burst") ?? 0;
    if (burst >= 2) {
      const burstThreats = threatsBy(threats, (m) => m.tags.includes("burst"));
      recs.push({
        id: "rule:burst",
        category: "defensive-item",
        severity: bumpSeverity(burst >= 3 ? "high" : "medium", anyFed(burstThreats)),
        title: `Survive burst windows`,
        body:
          "Zhonya's Hourglass on AP carries (or Stopwatch rush). " +
          "Guardian Angel on AD carries that get dove. " +
          "Edge of Night to block the engage CC. Position behind frontline.",
        rationale: `Burst threats: ${formatThreats(burstThreats, { withKDA: true })}.`,
      });
    }

    // ---- Tank stack → %HP damage ----
    const tank = tagsCount.get("tank") ?? 0;
    if (tank >= 2) {
      const tankThreats = threatsBy(threats, (m) => m.tags.includes("tank"));
      recs.push({
        id: "rule:tank-heavy",
        category: "offensive-item",
        severity: bumpSeverity(tank >= 3 ? "high" : "medium", anyFed(tankThreats)),
        title: `Build %HP damage vs ${tank} tanks`,
        body:
          "Liandry's Anguish + Demonic Embrace on mages. " +
          "Blade of the Ruined King on attack-speed AD. " +
          "Conqueror keystone on bruisers. Black Cleaver to shred armor for the team.",
        rationale: `Tank threats: ${formatThreats(tankThreats, { withKDA: true })}.`,
      });
    }

    // ---- Engage threat → disengage / GA / Edge of Night ----
    const engage = tagsCount.get("engage") ?? 0;
    if (engage >= 2) {
      const engageThreats = threatsBy(threats, (m) => m.tags.includes("engage"));
      recs.push({
        id: "rule:engage",
        category: "strategy",
        severity: bumpSeverity(engage >= 3 ? "high" : "medium", anyFed(engageThreats)),
        title: `Respect their engage`,
        body:
          "Don't facecheck brushes between minute 4–14. " +
          "Hold Flash on key targets. Buy Pink Wards before objectives. " +
          "Consider Exhaust on one ally instead of Heal.",
        rationale: `Engage threats: ${formatThreats(engageThreats, { withKDA: true })}.`,
      });
    }

    // ---- Poke comp ----
    const poke = tagsCount.get("poke") ?? 0;
    if (poke >= 3) {
      const pokeThreats = threatsBy(threats, (m) => m.tags.includes("poke"));
      recs.push({
        id: "rule:poke",
        category: "strategy",
        severity: bumpSeverity("medium", anyFed(pokeThreats)),
        title: `Counter their poke`,
        body:
          "Don't sit in poke range without a frontline absorbing. " +
          "Force fights through tight terrain (river, dragon pit). " +
          "Buy MR shoes early for AP poke; sustain support (Soraka/Nami) helps.",
        rationale: `Poke threats: ${formatThreats(pokeThreats, { withKDA: true })}.`,
      });
    }

    // ---- Scaling → end early ----
    const scaling = tagsCount.get("scaling") ?? 0;
    if (scaling >= 2) {
      const scaleThreats = threatsBy(threats, (m) => m.tags.includes("scaling"));
      recs.push({
        id: "rule:scaling",
        category: "strategy",
        severity: bumpSeverity(scaling >= 3 ? "high" : "medium", anyFed(scaleThreats)),
        title: `End the game before minute 30`,
        body:
          "Their power curve outscales yours. Force objectives at every cooldown. " +
          "Take Rift Herald and use it on towers. Snowball mid > side lanes. " +
          "If you fall behind, play 4-1 splitpush rather than 5v5.",
        rationale: `Scaling threats: ${formatThreats(scaleThreats, { withKDA: true })}.`,
      });
    }

    // ---- Splitpush threat ----
    const split = tagsCount.get("split") ?? 0;
    if (split >= 1) {
      const splitThreats = threatsBy(threats, (m) => m.tags.includes("split"));
      recs.push({
        id: "rule:split",
        category: "strategy",
        severity: bumpSeverity("medium", anyFed(splitThreats)),
        title: `Match their splitpush`,
        body:
          "Always know where their splitpusher is. Trade objectives — don't try to 5v4 catch. " +
          "TP on top laner. Have one ally (jg/sup) ward inner river when team grouped.",
        rationale: `Splitpush threats: ${formatThreats(splitThreats, { withKDA: true })}.`,
      });
    }

    // ---- Shielding → antishield ----
    const shielding = tagsCount.get("shielding") ?? 0;
    if (shielding >= 2) {
      const shieldThreats = threatsBy(threats, (m) => m.tags.includes("shielding"));
      recs.push({
        id: "rule:shielding",
        category: "offensive-item",
        severity: bumpSeverity("medium", anyFed(shieldThreats)),
        title: `Cut through shields`,
        body:
          "Serpent's Fang on AD assassins/marksmen. " +
          "Axiom Arc / lethality items help burst through. " +
          "Force fights when their shield CDs are down (post-engage).",
        rationale:
          shieldThreats.length > 0
            ? `Shield sources: ${formatThreats(shieldThreats, { withKDA: true })}.`
            : "Multiple sources of shielding in their composition.",
      });
    }

    // ---- Objective priority based on power curve ----
    if (scaling >= 2 && burst <= 1 && engage <= 1) {
      recs.push({
        id: "rule:obj-early",
        category: "objective",
        severity: "high",
        title: `Prioritize early objectives`,
        body:
          "First two drakes + Herald are critical against scalers. " +
          "Force a fight at the first drake spawn (5:00).",
      });
    } else if (engage >= 3) {
      recs.push({
        id: "rule:obj-disengage",
        category: "objective",
        severity: "medium",
        title: `Take objectives only with vision`,
        body:
          "Their engage thrives on ungrouped fights. " +
          "Sweep both river bushes before Drake/Herald. Don't 4v5 contest.",
      });
    }

    // ---- Per-ally squishy callout for assassin threat ----
    const burstThreats = burst >= 2;
    const burstThreatList = threatsBy(threats, (m) => m.tags.includes("burst"));
    const burstFed = anyFed(burstThreatList);
    if (burstThreats) {
      for (const ally of allies) {
        const m = metaFor(ally.character.id);
        if (!m) continue;
        const isSquishy =
          m.archetype === "marksman" ||
          m.archetype === "mage" ||
          (m.archetype === "support" && !m.tags.includes("tank"));
        if (isSquishy) {
          recs.push({
            id: `rule:squishy:${ally.character.id}`,
            category: "lane-matchup",
            severity: bumpSeverity("medium", burstFed),
            title: `${fallbackName(ally.character.id)}: rush a defensive item`,
            body:
              m.damageType === "ap"
                ? "Stopwatch component → Zhonya's first back."
                : "Cloth Armor + 5 pots, then Plated Steelcaps. Stopwatch on a longer-CD ult window.",
            forAllyPosition: ally.position,
          });
        }
      }
    }

    // Sort by severity (critical first) then preserve insertion order
    const sevRank: Record<string, number> = { critical: 0, high: 1, medium: 2, low: 3 };
    recs.sort((a, b) => sevRank[a.severity] - sevRank[b.severity]);

    return recs;
  },
};
