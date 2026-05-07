import type { Recommender } from "../adapter";
import type { Match, Recommendation, RecommendationSource } from "../types";
import {
  allyHasAntiheal,
  anyFed,
  buildEnemyItemProfile,
  bumpSeverity,
  type EnemyItemProfile,
  evaluateThreats,
  formatThreats,
  getAllyActions,
  getMatchPlan,
  type Threat,
} from "./ally-actions";
import { getChampMeta, type LeagueChampMeta } from "./data";
import { computeMatchIntel } from "./intel";

/**
 * Layer-1 rules-based recommender for LoL. Reads enemy team comp + live
 * item state from the normalized Match and emits prioritized Recommendations.
 *
 * Layer 1 (this file):
 *   - Rules anchored to BOTH champion tags (the static layer) AND real
 *     completed items pulled via EnemyItemProfile (the live layer).
 *   - Rationale strings cite triggering items where the rule is item-driven.
 *   - Severity escalates one step when matched threats are fed AND another
 *     step when matched threats have built core items.
 *   - Every Recommendation carries source: { layer: 1, ruleId } so callers
 *     can distinguish layer-1 output from layers 2/3 once those land.
 *
 * Layer 1 degrades cleanly when the item DB hasn't been warmed (Spectator-V5
 * draft path, item DB fetch failed): EnemyItemProfile is empty, rules fall
 * back to pure tag-based behaviour, identical to the pre-Layer-1 output.
 */

/** Helper: every layer-1 emit carries the same `source` shape. */
function l1(ruleId: string): RecommendationSource {
  return { layer: 1, ruleId };
}

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
        source: l1("fallback:no-meta"),
      });
      return recs;
    }

    const threats = evaluateThreats(enemies, enemyMetas);
    const { ad, ap, tagsCount } = tally(enemyMetas);
    const total = enemyMetas.length;

    // Layer-1: compute the enemy item profile once. Empty when the item DB
    // hasn't been warmed; rules then degrade to tag-only behaviour.
    const itemProfile: EnemyItemProfile = buildEnemyItemProfile(enemies);
    const allyAntiheal = allyHasAntiheal(allies);
    /** True when at least one matched threat has 2+ completed legendaries —
     *  used to bump severity beyond the "fed" bump for late-game urgency. */
    const threatsAreCored = (matched: Threat[]) =>
      matched.some((t) => t.completedItems >= 2);

    // ---- Damage profile ----
    // Layer-1 upgrade: rule fires on EITHER champion-tag count >= 3 OR
    // completed AP/AD-tagged items >= 4. So a 2-AP team that rushed AP items
    // still triggers, and severity escalates as their items mature.
    const apItemCount = itemProfile.presence.get("AP") ?? 0;
    if (ap >= 3 || apItemCount >= 4) {
      const apThreats = threatsBy(threats, (m) => m.damageType === "ap");
      const apFed = anyFed(apThreats);
      const apCored = threatsAreCored(apThreats);
      recs.push({
        id: "rule:ap-heavy",
        category: "defensive-item",
        severity: bumpSeverity(
          bumpSeverity(ap >= 4 || apItemCount >= 6 ? "critical" : "high", apFed),
          apCored,
        ),
        title: `Stack Magic Resist — ${ap}/${total} enemies deal magic damage`,
        body:
          "Hexdrinker → Maw of Malmortius for AD/skirmishers. Mercury's Treads on most. " +
          "Force of Nature on tanks. Wit's End on attack-speed champs.",
        rationale:
          apItemCount > 0
            ? `Enemy AP threats: ${formatThreats(apThreats, { withKDA: true })}. ${apItemCount} completed AP items already on the board.`
            : `Enemy AP threats: ${formatThreats(apThreats, { withKDA: true })}.`,
        source: l1("ap-heavy"),
      });
    }
    const adItemCount = itemProfile.presence.get("AD") ?? 0;
    if (ad >= 3 || adItemCount >= 4) {
      const adThreats = threatsBy(threats, (m) => m.damageType === "ad");
      const adFed = anyFed(adThreats);
      const adCored = threatsAreCored(adThreats);
      recs.push({
        id: "rule:ad-heavy",
        category: "defensive-item",
        severity: bumpSeverity(
          bumpSeverity(ad >= 4 || adItemCount >= 6 ? "critical" : "high", adFed),
          adCored,
        ),
        title: `Stack Armor — ${ad}/${total} enemies deal physical damage`,
        body:
          "Plated Steelcaps for ranged-AD-heavy comps. Tabis on most. " +
          "Frozen Heart vs auto-attackers, Randuin's vs crit. " +
          "Thornmail if you also need anti-heal.",
        rationale:
          adItemCount > 0
            ? `Enemy AD threats: ${formatThreats(adThreats, { withKDA: true })}. ${adItemCount} completed AD items already on the board.`
            : `Enemy AD threats: ${formatThreats(adThreats, { withKDA: true })}.`,
        source: l1("ad-heavy"),
      });
    }

    // ---- Healing/sustain → Grievous Wounds ----
    // Layer-1 upgrade: separate the *static* threat (champion has healing
    // tag) from the *active* threat (enemy actually built sustain items).
    // We fire at LOW severity for static-only (advisory: plan for it), and
    // escalate to HIGH/CRITICAL when items confirm the threat. If an ally
    // already owns antiheal, we drop one severity step (problem is partly
    // addressed).
    const healing = tagsCount.get("healing") ?? 0;
    const healingItemsActive = itemProfile.healingItems;
    if (healing >= 1 || healingItemsActive.length > 0) {
      const healers = threatsBy(threats, (m) => m.tags.includes("healing"));
      // Base severity: items present trumps champion tags alone
      let antihealSeverity: "low" | "medium" | "high" | "critical" =
        healingItemsActive.length === 0
          ? "low" // Champion-tag only, no items yet — advisory
          : healingItemsActive.length === 1
            ? "high"
            : "critical";
      antihealSeverity = bumpSeverity(antihealSeverity, anyFed(healers));
      // De-escalate if the team has already addressed it.
      if (allyAntiheal && antihealSeverity !== "low") {
        antihealSeverity =
          antihealSeverity === "critical"
            ? "medium"
            : antihealSeverity === "high"
              ? "medium"
              : "low";
      }

      const itemList = healingItemsActive
        .slice(0, 3)
        .map((h) => `${fallbackName(h.ownerChampionId)} → ${h.itemName}`)
        .join(", ");

      const rationale =
        healingItemsActive.length > 0
          ? allyAntiheal
            ? `Enemy sustain in play: ${itemList}. An ally already owns antiheal — confirm coverage or stack more.`
            : `Enemy sustain in play: ${itemList}.`
          : `Healing threats (no sustain items yet): ${formatThreats(healers, { withKDA: true })}.`;

      recs.push({
        id: "rule:antiheal",
        category: "offensive-item",
        severity: antihealSeverity,
        title:
          healingItemsActive.length > 0
            ? "Antiheal is critical now"
            : "Plan for antiheal — enemy has sustain champions",
        body:
          "Executioner's Calling / Bramble Vest at first back. " +
          "Mortal Reminder for ADCs, Morellonomicon for mages, Chempunk for bruisers. " +
          "Don't skip — sustain compounds without antiheal.",
        rationale,
        source: l1("antiheal"),
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
        source: l1("cc-heavy"),
      });
    }

    // ---- Burst / dive → Zhonya / GA ----
    // Layer-1: bump severity when the burst threats have actually built
    // their core damage items. A 2-burst comp at 1-item is much less scary
    // than a 2-burst comp at 3-item.
    const burst = tagsCount.get("burst") ?? 0;
    if (burst >= 2) {
      const burstThreats = threatsBy(threats, (m) => m.tags.includes("burst"));
      const burstFed = anyFed(burstThreats);
      const burstCored = threatsAreCored(burstThreats);
      recs.push({
        id: "rule:burst",
        category: "defensive-item",
        severity: bumpSeverity(
          bumpSeverity(burst >= 3 ? "high" : "medium", burstFed),
          burstCored,
        ),
        title: `Survive burst windows`,
        body:
          "Zhonya's Hourglass on AP carries (or Stopwatch rush). " +
          "Guardian Angel on AD carries that get dove. " +
          "Edge of Night to block the engage CC. Position behind frontline.",
        rationale: burstCored
          ? `Burst threats with core items: ${formatThreats(burstThreats, { withKDA: true })}.`
          : `Burst threats: ${formatThreats(burstThreats, { withKDA: true })}.`,
        source: l1("burst"),
      });
    }

    // ---- Tank stack → %HP damage ----
    // Layer-1: only fire when tagged tanks have ALSO built tanky items.
    // A "tank" champion at 1500g with no Health/Armor items isn't a real
    // tank threat yet — they're just a tagged frontliner without resists.
    const tank = tagsCount.get("tank") ?? 0;
    const enemyHpItems = itemProfile.presence.get("HP") ?? 0;
    const enemyArmorItems = itemProfile.presence.get("Armor") ?? 0;
    const enemyMrItems = itemProfile.presence.get("MR") ?? 0;
    const tankItemThreshold = enemyHpItems + Math.max(enemyArmorItems, enemyMrItems);
    if (tank >= 2 && (itemProfile.totalCompletedItems === 0 || tankItemThreshold >= 2)) {
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
        rationale:
          tankItemThreshold > 0
            ? `Tank threats: ${formatThreats(tankThreats, { withKDA: true })}. ${tankItemThreshold} tanky items already built.`
            : `Tank threats: ${formatThreats(tankThreats, { withKDA: true })}.`,
        source: l1("tank-heavy"),
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
        source: l1("engage"),
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
        source: l1("poke"),
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
        source: l1("scaling"),
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
        source: l1("split"),
      });
    }

    // ---- Shielding → antishield ----
    const shielding = tagsCount.get("shielding") ?? 0;
    const shieldItemCount = itemProfile.presence.get("Shielding") ?? 0;
    if (shielding >= 2 || shieldItemCount >= 2) {
      const shieldThreats = threatsBy(threats, (m) => m.tags.includes("shielding"));
      recs.push({
        id: "rule:shielding",
        category: "offensive-item",
        severity: bumpSeverity(
          shieldItemCount >= 2 ? "high" : "medium",
          anyFed(shieldThreats),
        ),
        title: `Cut through shields`,
        body:
          "Serpent's Fang on AD assassins/marksmen. " +
          "Axiom Arc / lethality items help burst through. " +
          "Force fights when their shield CDs are down (post-engage).",
        rationale:
          shieldItemCount > 0
            ? `Shield items in play: ${shieldItemCount} on ${formatThreats(shieldThreats, { withKDA: true })}.`
            : shieldThreats.length > 0
              ? `Shield sources: ${formatThreats(shieldThreats, { withKDA: true })}.`
              : "Multiple sources of shielding in their composition.",
        source: l1("shielding"),
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
        source: l1("obj-early"),
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
        source: l1("obj-disengage"),
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
            source: l1(`squishy-callout`),
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
