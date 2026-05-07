/**
 * Curated champion knowledge — typical build paths, power spikes, and
 * specific items that counter the champion when enemies build them.
 *
 * Coverage is intentionally limited to a representative seed (5 champions
 * across all 5 roles). Top-50 expansion is N+2 in
 * docs/plans/recommender-tiered-engine.md. Adding entries is purely
 * additive — recommender-l2 falls back to layer-1 advice for champions
 * not in this map.
 *
 * Citations:
 *   - "DDragon:champion:<ID>" — Riot's published ability descriptions in
 *     Data Dragon's champion.json. Mechanic claims (heal source, projectile
 *     interaction, etc.) trace to those.
 *   - "DDragon:NNNN" — Riot's item description text for item ID NNNN.
 *
 * Pinned to major patch via `patchPinned`. Build paths shift more often
 * than ability mechanics — review per-champion when patch updates.
 */

import type { ThreatType } from "../../types";

export interface CuratedChampionBuildPath {
  position: "TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY";
  /** Items the champion typically builds in this position, ordered as a
   *  reasonable progression. Not prescriptive — adapts to game state.
   *  IDs match Riot Data Dragon item.json. */
  items: string[];
  cite: string;
}

export interface CuratedChampionPowerSpike {
  /** Item IDs whose completion (in any order) marks the spike. */
  items: string[];
  label: string;
  threatLevel: "low" | "medium" | "high" | "critical";
  /** Optional spike-specific citation. When omitted, the coreBuild's cite
   *  is the source of truth for *why* these items spike together. */
  cite?: string;
}

export interface CuratedChampionCounter {
  itemId: string;
  /** Why this item specifically hurts THIS champion (kit interaction, not
   *  generic stat counter). */
  reason: string;
  cite: string;
}

export interface CuratedChampion {
  id: string;
  name: string;
  positions: ("TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY")[];
  /** Threat type this champion's KIT signals, before items refine it. */
  intrinsicThreatTypes: ThreatType[];
  coreBuild: CuratedChampionBuildPath[];
  powerSpikes: CuratedChampionPowerSpike[];
  counteredBy: CuratedChampionCounter[];
  patchPinned: string;
}

const PATCH_PINNED = "14";

export const CURATED_CHAMPIONS: Record<string, CuratedChampion> = {
  Yasuo: {
    id: "Yasuo",
    name: "Yasuo",
    positions: ["MIDDLE", "TOP"],
    // Yasuo is a melee skirmisher with crit-scaling and a wall (W) that
    // blocks ranged projectiles but not point-and-click abilities or melee.
    intrinsicThreatTypes: ["AD-sustained", "Engage"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "3046", // Phantom Dancer (his innate crit doubling makes crit chance especially valuable)
          "3031", // Infinity Edge (crit damage amp, core powerspike)
          "3072", // Bloodthirster (sustain in extended trades)
          "3026", // Guardian Angel (assassin matchups in lategame)
        ],
        cite: "Yasuo passive 'Way of the Wanderer' — crit chance doubled, halved crit damage. Crit items are core. (DDragon:champion:Yasuo)",
      },
    ],
    powerSpikes: [
      {
        items: ["3046", "3031"],
        label: "PD + IE — 2-item crit spike",
        threatLevel: "high",
        cite: "Yasuo's 100% crit chance threshold reached at PD+IE due to passive doubling. (DDragon:champion:Yasuo, DDragon:3031)",
      },
    ],
    counteredBy: [
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks his Q3 knockup OR ult lockdown — his entire kill pattern depends on landing tornado-into-ult.",
        cite: "Yasuo Q3 'Gathering Storm' is a knockup that stops on shield. (DDragon:champion:Yasuo)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his ult-knockup so allies can fight back — ult is his only reliable lockdown.",
        cite: "Yasuo R 'Last Breath' suspends knockup-affected targets. QSS removes the airborne state. (DDragon:champion:Yasuo, DDragon:3140)",
      },
      {
        itemId: "3110",
        reason:
          "Frozen Heart aura attack-speed slow neuters his sustained DPS — he relies on AS scaling from gear.",
        cite: "DDragon:3110 (aura AS slow)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Ahri: {
    id: "Ahri",
    name: "Ahri",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "Roam"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "3152", // Hextech Rocketbelt (engage + burst)
          "3020", // Sorcerer's Shoes
          "3135", // Void Staff (mid-game MR shred)
          "3089", // Rabadon's Deathcap (lategame AP scaling)
        ],
        cite: "Ahri scales with AP burst items + mobility for E-charm pickoffs. Rocketbelt is a common mythic-tier engage tool. (DDragon:champion:Ahri)",
      },
    ],
    powerSpikes: [
      {
        items: ["3152"],
        label: "Mythic engage tool — first roam window",
        threatLevel: "high",
        cite: "Rocketbelt active dash + AoE adds the burst confirm she lacks at base. (DDragon:3152)",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield blocks her Charm (E) — without the charm, her ult-into-Q burst can't connect.",
        cite: "Ahri E 'Charm' is a single-target projectile ability. (DDragon:champion:Ahri, DDragon:3102)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses Charm — break the lockdown that opens her combo.",
        cite: "DDragon:3140",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Aatrox: {
    id: "Aatrox",
    name: "Aatrox",
    positions: ["TOP"],
    // Aatrox heals from his passive (basic-attack heal on champion hits) and
    // amplifies it on takedowns. Without antiheal he becomes near-unkillable
    // in extended fights once items are online.
    intrinsicThreatTypes: ["Healing", "Engage", "AD-sustained"],
    coreBuild: [
      {
        position: "TOP",
        items: [
          "6630", // Goredrinker / new sustain bruiser mythic (current name varies by patch — verify in DDragon)
          "3047", // Plated Steelcaps
          "6333", // Death's Dance (bleed + sustain layering on his passive heal)
          "3053", // Sterak's Gage (HP shield + tenacity)
        ],
        cite: "Aatrox bruiser path — sustain layered on his passive heal, frontline survivability for extended fights. (DDragon:champion:Aatrox)",
      },
    ],
    powerSpikes: [
      {
        items: ["6630", "6333"],
        label: "Sustain bruiser core (Mythic + Death's Dance)",
        threatLevel: "high",
        cite: "Aatrox passive heal + Death's Dance bleed conversion creates near-unkillable extended fights without antiheal. (DDragon:champion:Aatrox, DDragon:6333)",
      },
    ],
    counteredBy: [
      {
        itemId: "3076",
        reason:
          "Bramble Vest applies Grievous Wounds when he basic-attacks you — his passive heal is gated through autos, so this directly cuts the source.",
        cite: "Aatrox passive 'Deathbringer Stance' heals on champion-hit basic attacks. (DDragon:champion:Aatrox, DDragon:3076)",
      },
      {
        itemId: "3033",
        reason:
          "Mortal Reminder applies Grievous Wounds on physical damage to him — neutralises his ult-amplified passive heal in trades.",
        cite: "Aatrox R 'World Ender' boosts his healing while active. Mortal Reminder cuts that healing in half. (DDragon:champion:Aatrox, DDragon:3033)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Jinx: {
    id: "Jinx",
    name: "Jinx",
    positions: ["BOTTOM"],
    // Jinx is a hyperscaling AD ranged carry with crit-scaling and rocket
    // launcher (Q swap). Vulnerable to dive/burst before her items come online.
    intrinsicThreatTypes: ["AD-sustained", "AD-attackspeed", "Poke"],
    coreBuild: [
      {
        position: "BOTTOM",
        items: [
          "6672", // Kraken Slayer (on-hit true damage every 3rd auto)
          "3006", // Berserker's Greaves
          "3094", // Rapid Firecannon (extra range on first auto, perfect for rockets)
          "3031", // Infinity Edge (crit amp, hyper-spike)
          "3072", // Bloodthirster (sustain in fights)
        ],
        cite: "Jinx scales as a long-range crit ADC. Range items (RFC) + on-hit true damage (Kraken) maximize her rocket-Q damage. (DDragon:champion:Jinx)",
      },
    ],
    powerSpikes: [
      {
        items: ["6672", "3094"],
        label: "Kraken + RFC — siege range powerspike",
        threatLevel: "medium",
      },
      {
        items: ["6672", "3094", "3031"],
        label: "3-item — full carry threat",
        threatLevel: "critical",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses ult-snare — her R 'Super Mega Death Rocket' applies a slow on hit; QSS removes it from the dive target.",
        cite: "Jinx R applies a slowing zone. (DDragon:champion:Jinx, DDragon:3140)",
      },
      {
        itemId: "3026",
        reason:
          "Guardian Angel forces her to commit ult / rockets twice — buys time for a peeler to get to her.",
        cite: "DDragon:3026",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Darius: {
    id: "Darius",
    name: "Darius",
    positions: ["TOP"],
    intrinsicThreatTypes: ["Healing", "AD-sustained", "Engage"],
    coreBuild: [
      {
        position: "TOP",
        items: [
          "6630", // Stridebreaker / sustain mythic
          "3047",
          "3071", // Black Cleaver — armor shred amplifies his bleed
          "3053", // Sterak's Gage
        ],
        cite: "Darius layers his bleed (passive Hemorrhage) with armor-shred + sustain bruiser items. (DDragon:champion:Darius)",
      },
    ],
    powerSpikes: [
      {
        items: ["6630", "3071"],
        label: "Mythic + Black Cleaver — armor-shred power spike",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3076",
        reason:
          "Bramble Vest: every Darius auto-attack feeds his bleed AND triggers Bramble's Grievous Wounds — directly cuts the heal his ult provides on takedowns.",
        cite: "Darius R 'Noxian Guillotine' resets and heals on champion takedown. (DDragon:champion:Darius, DDragon:3076)",
      },
      {
        itemId: "3033",
        reason:
          "Mortal Reminder neutralises ult-takedown heal. Without sustain, his all-in becomes a one-shot trade rather than a fight reset.",
        cite: "DDragon:champion:Darius, DDragon:3033",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Malphite: {
    id: "Malphite",
    name: "Malphite",
    positions: ["TOP"],
    intrinsicThreatTypes: ["Engage", "CC-chain", "Tank", "AP-burst"],
    coreBuild: [
      {
        position: "TOP",
        items: [
          "3068", // Sunfire Aegis — tank engage mythic
          "3047",
          "3193", // Gargoyle Stoneplate — survive his own ult dive
          "3110", // Frozen Heart vs ADC
        ],
        cite: "Malphite scales as armor-stacking tank engage. AP-Malphite is a separate build path; default here is the TOP tank build. (DDragon:champion:Malphite)",
      },
    ],
    powerSpikes: [
      {
        items: ["3068"],
        label: "Tank mythic up — ult engage threat",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his ult knockup — without R landing, his entire team-fight kit disappears.",
        cite: "Malphite R 'Unstoppable Force' is a dash with AoE knockup at the destination. (DDragon:champion:Malphite, DDragon:3140)",
      },
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks his ult outright on the carry it targets.",
        cite: "DDragon:3814",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  "Lee Sin": {
    id: "LeeSin",
    name: "Lee Sin",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "Roam"],
    coreBuild: [
      {
        position: "JUNGLE",
        items: [
          "6692", // Eclipse — burst lethality mythic for assassin junglers
          "3047",
          "6691", // Duskblade — gank-window stealth attack bonus
          "6333", // Death's Dance — bleed conversion in extended fights
        ],
        cite: "Lee Sin lethality jungle build. Eclipse first item is the canonical AD-burst mythic for him post-rework. (DDragon:champion:LeeSin)",
      },
    ],
    powerSpikes: [
      {
        items: ["6692"],
        label: "Mythic up — gank threat critical",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks his Q (Sonic Wave) — his entire combo opens with that hit.",
        cite: "Lee Sin Q 'Sonic Wave' is a skillshot that enables his Q2 and ult setup. (DDragon:champion:LeeSin, DDragon:3814)",
      },
      {
        itemId: "3026",
        reason:
          "Guardian Angel revives squishies after his ult kick — denies the kill confirm even if Insec lands.",
        cite: "DDragon:3026",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Lux: {
    id: "Lux",
    name: "Lux",
    positions: ["MIDDLE", "UTILITY"],
    intrinsicThreatTypes: ["AP-burst", "Poke", "CC-chain", "Shielding"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "6655", // Luden's Companion — burst AP mythic
          "3020",
          "3135", // Void Staff
          "3089", // Rabadon's Deathcap
        ],
        cite: "Lux mid burst-mage path — Ludens for poke + burst on her ult-Q combo. (DDragon:champion:Lux)",
      },
    ],
    powerSpikes: [
      {
        items: ["6655", "3089"],
        label: "Ludens + Rabadon — full ult-combo deletes squishies",
        threatLevel: "critical",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield blocks her Q (Light Binding) — her entire kill combo starts with the Q snare.",
        cite: "Lux Q 'Light Binding' is a single-target projectile that roots. Spell-shield consumes it. (DDragon:champion:Lux, DDragon:3102)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses the snare — even if Q lands, the followup ult misses.",
        cite: "DDragon:3140",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Zed: {
    id: "Zed",
    name: "Zed",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AD-burst", "Roam"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "6691", // Duskblade — assassin out-of-stealth bonus
          "3142", // Youmuu's
          "3047",
          "6694", // Serylda's Grudge — armor pen for late-game tanks
        ],
        cite: "Zed lethality build — Duskblade's first-attack-from-stealth procs his W shadow swap. (DDragon:champion:Zed)",
      },
    ],
    powerSpikes: [
      {
        items: ["6691"],
        label: "Mythic up — pickoff range solidified",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his ult deathmark — the irrecoverable burst window collapses.",
        cite: "Zed R 'Death Mark' applies a delayed mark that detonates as bonus damage. QSS cleanses the mark. (DDragon:champion:Zed, DDragon:3140)",
      },
      {
        itemId: "3157",
        reason:
          "Zhonya's stasis lets the deathmark detonate on an invulnerable target — it does no damage. The classic Zed counter.",
        cite: "Zhonya's active grants 2.5s stasis; Zed deathmark detonation is a damage tick. (DDragon:3157)",
      },
      {
        itemId: "3026",
        reason:
          "Guardian Angel revives if the ult does kill — buys peel time for follow-up.",
        cite: "DDragon:3026",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Caitlyn: {
    id: "Caitlyn",
    name: "Caitlyn",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["Poke", "AD-attackspeed", "AD-sustained"],
    coreBuild: [
      {
        position: "BOTTOM",
        items: [
          "6671", // Galeforce — kiting tool
          "3006",
          "3094", // RFC — extends already-long range
          "3031", // IE
          "3072", // Bloodthirster
        ],
        cite: "Caitlyn long-range crit ADC. RFC + her natural 650 range makes her the longest-poke ADC by minute 25. (DDragon:champion:Caitlyn)",
      },
    ],
    powerSpikes: [
      {
        items: ["6671", "3094"],
        label: "Mythic + RFC — siege poke threat",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3110",
        reason:
          "Frozen Heart slows attack speed — directly counters her sustained DPS in extended trades.",
        cite: "DDragon:3110",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Lulu: {
    id: "Lulu",
    name: "Lulu",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Shielding", "CC-chain", "AP-sustained"],
    coreBuild: [
      {
        position: "UTILITY",
        items: [
          "3504", // Ardent Censer — heal/shield amp for AS carries
          "3158",
          "3107", // Redemption — ally heal
          "3222", // Mikael's Blessing
        ],
        cite: "Lulu enchanter support — heal/shield amp for hyper-carry duos. (DDragon:champion:Lulu)",
      },
    ],
    powerSpikes: [
      {
        items: ["3504"],
        label: "Ardent up — carry hyperscaling unlocked",
        threatLevel: "medium",
      },
    ],
    counteredBy: [
      {
        itemId: "6695",
        reason:
          "Serpent's Fang shreds the shields she layers on her carry. Single most direct counter to enchanter shield-spam.",
        cite: "Lulu E 'Help Pix!' applies a shield. Lulu R 'Wild Growth' grants bonus HP. Both are shielding/HP buffs Serpent's Fang counters. (DDragon:champion:Lulu, DDragon:6695)",
      },
      {
        itemId: "3033",
        reason:
          "Mortal Reminder reduces the heal from Redemption / Ardent procs on the protected carry.",
        cite: "DDragon:3033",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Vayne: {
    id: "Vayne",
    name: "Vayne",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-attackspeed", "AD-sustained"],
    coreBuild: [
      {
        position: "BOTTOM",
        items: [
          "6672", // Kraken Slayer — every-3rd-auto true damage
          "3006",
          "3153", // BotRK — % current HP on-hit
          "3046", // Phantom Dancer
          "3072", // Bloodthirster
        ],
        cite: "Vayne hyperscaling on-hit ADC — Kraken + BotRK stack with her W 'Silver Bolts' true damage every 3rd hit. (DDragon:champion:Vayne)",
      },
    ],
    powerSpikes: [
      {
        items: ["6672", "3153"],
        label: "Kraken + BotRK — tank-shredder online",
        threatLevel: "critical",
      },
    ],
    counteredBy: [
      {
        itemId: "3110",
        reason:
          "Frozen Heart attack-speed slow gates her entire damage profile — she relies on stacking autos for true damage proc.",
        cite: "Vayne W 'Silver Bolts' triggers every 3rd consecutive auto. AS slow delays each proc. (DDragon:champion:Vayne, DDragon:3110)",
      },
      {
        itemId: "3143",
        reason:
          "Randuin's reduces crit damage — Vayne's late-game IE/Phantom Dancer crits are her finishers.",
        cite: "DDragon:3143",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Akshan: {
    id: "Akshan",
    name: "Akshan",
    positions: ["MIDDLE", "BOTTOM"],
    intrinsicThreatTypes: ["AD-burst", "AD-sustained", "Roam"],
    coreBuild: [
      { position: "MIDDLE", items: ["3142", "3158", "3094", "6694"], cite: "Akshan AD revenge-marker — passive marks champions who kill an ally; killing them resurrects allies. (DDragon:champion:Akshan)" },
    ],
    powerSpikes: [{ items: ["3142"], label: "Lethality mythic — global revive pickoff", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3026", reason: "Guardian Angel — denies the carry kill that triggers his revenge resurrection.", cite: "DDragon:3026" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Alistar: {
    id: "Alistar",
    name: "Alistar",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Engage", "CC-chain", "Tank"],
    coreBuild: [
      { position: "UTILITY", items: ["3190", "3111", "3050", "3193"], cite: "Alistar engage tank-support — Q-W combo flips enemy + knocks up; R 'Unbreakable Will' grants damage reduction. (DDragon:champion:Alistar)" },
    ],
    powerSpikes: [{ items: ["3190"], label: "Locket — engage + team shield", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his Q-W flip-knockup combo on the carry.", cite: "Alistar W flips an enemy in a direction; Q is an AOE knockup. (DDragon:champion:Alistar, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Amumu: {
    id: "Amumu",
    name: "Amumu",
    positions: ["JUNGLE", "UTILITY"],
    intrinsicThreatTypes: ["Engage", "CC-chain", "Tank"],
    coreBuild: [
      { position: "JUNGLE", items: ["3068", "3047", "3193", "4401"], cite: "Amumu tank engage — Q 'Bandage Toss' single-target gap-close; R 'Curse of the Sad Mummy' AOE entangle. (DDragon:champion:Amumu)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Tank mythic — R team-fight initiation", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R AOE root.", cite: "Amumu R AOE roots all enemies in radius. (DDragon:champion:Amumu, DDragon:3140)" },
      { itemId: "3814", reason: "Edge of Night blocks his Q gap-close stun.", cite: "Amumu Q is a single-target stun-pull. (DDragon:champion:Amumu, DDragon:3814)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Anivia: {
    id: "Anivia",
    name: "Anivia",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "AP-sustained", "CC-chain"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3089"], cite: "Anivia control mage — passive 'Rebirth' resurrects as an egg. R 'Glacial Storm' is a sustained AOE zone. (DDragon:champion:Anivia)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — Q-E combo + R zone", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3102", reason: "Banshee's Veil spell-shield blocks her Q (Flash Frost) stun.", cite: "Anivia Q is a long-range stun-projectile that detonates on cast. (DDragon:champion:Anivia, DDragon:3102)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Bard: {
    id: "Bard",
    name: "Bard",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["CC-chain", "Roam"],
    coreBuild: [
      { position: "UTILITY", items: ["3158", "3504", "3107", "3222"], cite: "Bard roaming support — Q 'Cosmic Binding' double-stun on terrain bounce; R 'Tempered Fate' AOE stasis. (DDragon:champion:Bard)" },
    ],
    powerSpikes: [{ items: ["3504"], label: "Ardent — utility powerspike", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R global stasis.", cite: "Bard R puts area into stasis (untargetable). (DDragon:champion:Bard, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Blitzcrank: {
    id: "Blitzcrank",
    name: "Blitzcrank",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Engage", "CC-chain"],
    coreBuild: [
      { position: "UTILITY", items: ["3190", "3111", "3050", "3193"], cite: "Blitzcrank hook-engage — Q 'Rocket Grab' single-target hook; R 'Static Field' silence + AOE damage. (DDragon:champion:Blitzcrank)" },
    ],
    powerSpikes: [{ items: ["3190"], label: "Locket — followup team shield", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3102", reason: "Banshee's Veil spell-shield blocks his Q hook — without the hook, his entire kit stalls.", cite: "Blitzcrank Q is a single-target pull-skillshot. (DDragon:champion:Blitzcrank, DDragon:3102)" },
      { itemId: "3814", reason: "Edge of Night for AD carries — same effect.", cite: "DDragon:3814" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Braum: {
    id: "Braum",
    name: "Braum",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Tank", "Shielding", "CC-chain"],
    coreBuild: [
      { position: "UTILITY", items: ["3193", "3111", "3050", "3110"], cite: "Braum frontline support — passive 'Concussive Blows' stuns on 4 stacks; W 'Stand Behind Me' jumps to ally + grants resists. (DDragon:champion:Braum)" },
    ],
    powerSpikes: [{ items: ["3193"], label: "Stoneplate — frontline durability", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "6695", reason: "Serpent's Fang shreds his W shield-buff and E (Unbreakable) wall mitigation.", cite: "Braum E creates a shield wall that blocks projectiles. (DDragon:champion:Braum, DDragon:6695)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Gragas: {
    id: "Gragas",
    name: "Gragas",
    positions: ["JUNGLE", "TOP", "MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "Engage", "CC-chain"],
    coreBuild: [
      { position: "JUNGLE", items: ["6655", "3047", "4401", "3157"], cite: "Gragas brawler-mage — R 'Explosive Cask' AOE displacement; E 'Body Slam' charge engage. (DDragon:champion:Gragas)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R team-fight displacement", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R knockback or E stun.", cite: "Gragas R AOE-knocks-back enemies. (DDragon:champion:Gragas, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Heimerdinger: {
    id: "Heimerdinger",
    name: "Heimerdinger",
    positions: ["MIDDLE", "UTILITY"],
    intrinsicThreatTypes: ["AP-DoT", "AP-sustained", "Poke"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3089"], cite: "Heimerdinger turret-stacker — Q drops H-28 G turrets; R upgrades them or his Q-W-E. (DDragon:champion:Heimerdinger)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — turret zone control", threatLevel: "high" }],
    counteredBy: [
      { itemId: "4401", reason: "Force of Nature against his sustained turret damage.", cite: "DDragon:4401" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Janna: {
    id: "Janna",
    name: "Janna",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Shielding", "CC-chain"],
    coreBuild: [
      { position: "UTILITY", items: ["3504", "3158", "3107", "3222"], cite: "Janna enchanter — E 'Eye of the Storm' shield + AD; R 'Monsoon' AOE knockback + heal channel. (DDragon:champion:Janna)" },
    ],
    powerSpikes: [{ items: ["3504"], label: "Ardent — carry hyperscaling", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "6695", reason: "Serpent's Fang shreds her E shields (which grant AD too).", cite: "Janna E shields target ally. (DDragon:champion:Janna, DDragon:6695)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Jarvan IV": {
    id: "JarvanIV",
    name: "Jarvan IV",
    positions: ["JUNGLE", "TOP"],
    intrinsicThreatTypes: ["Engage", "CC-chain", "AD-sustained"],
    coreBuild: [
      { position: "JUNGLE", items: ["6630", "3047", "3071", "3053"], cite: "Jarvan IV engage bruiser — E-Q combo knocks up; R 'Cataclysm' creates terrain prison. (DDragon:champion:JarvanIV)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic — full E-Q-R combo", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his E-Q knockup OR R prison.", cite: "DDragon:3140" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Maokai: {
    id: "Maokai",
    name: "Maokai",
    positions: ["UTILITY", "TOP"],
    intrinsicThreatTypes: ["CC-chain", "Tank", "Engage"],
    coreBuild: [
      { position: "UTILITY", items: ["3068", "3111", "3193", "3742"], cite: "Maokai tree-engage — R 'Nature's Grasp' is a long-range AOE root wall; passive heals on autos. (DDragon:champion:Maokai)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Tank mythic — R global engage", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R-wall root if you're caught.", cite: "Maokai R sends saplings forward, rooting hit enemies. (DDragon:champion:Maokai, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Milio: {
    id: "Milio",
    name: "Milio",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Healing", "Shielding", "CC-chain"],
    coreBuild: [
      { position: "UTILITY", items: ["3504", "3158", "3107", "3222"], cite: "Milio enchanter — passive grants ally on-hit magic + range; R 'Breath of Life' AOE heal + cleanse. (DDragon:champion:Milio)" },
    ],
    powerSpikes: [{ items: ["3504"], label: "Ardent — full carry buff", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts his R AOE heal.", cite: "Milio R heals all allies + cleanses CC. (DDragon:champion:Milio, DDragon:3033)" },
      { itemId: "3165", reason: "Morellonomicon for AP allies — same effect.", cite: "DDragon:3165" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Nami: {
    id: "Nami",
    name: "Nami",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Healing", "Shielding", "CC-chain"],
    coreBuild: [
      { position: "UTILITY", items: ["3504", "3158", "3107", "3222"], cite: "Nami enchanter — Q 'Aqua Prison' single-target stun-bubble; W 'Ebb and Flow' bouncing heal/damage. (DDragon:champion:Nami)" },
    ],
    powerSpikes: [{ items: ["3504"], label: "Ardent — bot-lane hyperscaling", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3102", reason: "Banshee's Veil spell-shield blocks her Q stun-bubble — primary lockdown tool.", cite: "Nami Q is a single-target stun-bubble (delayed). (DDragon:champion:Nami, DDragon:3102)" },
      { itemId: "3033", reason: "Mortal Reminder cuts her W heal pattern.", cite: "DDragon:3033" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Nilah: {
    id: "Nilah",
    name: "Nilah",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-sustained", "Healing", "Engage"],
    coreBuild: [
      { position: "BOTTOM", items: ["3153", "3006", "3072", "3046"], cite: "Nilah melee ADC — passive doubles ally heal/shield buffs received. (DDragon:champion:Nilah)" },
    ],
    powerSpikes: [{ items: ["3153"], label: "BotRK — sustain duel pattern", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts her doubled heals AND her own lifesteal.", cite: "Nilah passive doubles incoming heals/shields. (DDragon:champion:Nilah, DDragon:3033)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Nunu & Willump": {
    id: "Nunu",
    name: "Nunu & Willump",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["Engage", "CC-chain", "Tank"],
    coreBuild: [
      { position: "JUNGLE", items: ["6655", "3047", "4401", "3157"], cite: "Nunu snowball-jungler — Q 'Consume' devours camps for HP; R 'Absolute Zero' AOE channel-burst. (DDragon:champion:Nunu)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R AOE damage zone", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his W (Biggest Snowball Ever!) snowball-knockup or his R-channel snare.", cite: "Nunu W charges and knocks up; R AOE-slows + damages. (DDragon:champion:Nunu, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Qiyana: {
    id: "Qiyana",
    name: "Qiyana",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "CC-chain"],
    coreBuild: [
      { position: "MIDDLE", items: ["6692", "3158", "6694", "3072"], cite: "Qiyana element-shifting assassin — R 'Supreme Display of Talent' AOE shockwave-stun. (DDragon:champion:Qiyana)" },
    ],
    powerSpikes: [{ items: ["6692"], label: "Mythic — R team-fight initiation", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R wall-stun on hit.", cite: "Qiyana R AOE stuns enemies near walls. (DDragon:champion:Qiyana, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Rakan: {
    id: "Rakan",
    name: "Rakan",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Engage", "Shielding", "CC-chain"],
    coreBuild: [
      { position: "UTILITY", items: ["3190", "3111", "3050", "3107"], cite: "Rakan engage-enchanter — W 'Grand Entrance' charge + AOE knockup; R 'The Quickness' MS + charm. (DDragon:champion:Rakan)" },
    ],
    powerSpikes: [{ items: ["3190"], label: "Locket — team-fight engage chain", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his W knockup or R charm.", cite: "Rakan W AOE knocks up; R charms enemies on contact. (DDragon:champion:Rakan, DDragon:3140)" },
      { itemId: "6695", reason: "Serpent's Fang shreds his E (Battle Dance) shields on dash-target.", cite: "Rakan E shields self/ally on dash. (DDragon:champion:Rakan, DDragon:6695)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Rek'Sai": {
    id: "RekSai",
    name: "Rek'Sai",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "Roam"],
    coreBuild: [
      { position: "JUNGLE", items: ["6630", "3047", "3071", "3053"], cite: "Rek'Sai burrowing assassin — Q-burrowed knockup; R 'Void Rush' executes target globally with vision. (DDragon:champion:RekSai)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic — gank pickoff", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3026", reason: "Guardian Angel — denies her R global execute.", cite: "Rek'Sai R deals execute damage to enemy below threshold. (DDragon:champion:RekSai, DDragon:3026)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Rell: {
    id: "Rell",
    name: "Rell",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Tank", "Engage", "CC-chain"],
    coreBuild: [
      { position: "UTILITY", items: ["3068", "3111", "3193", "3110"], cite: "Rell tank engage — W 'Ferromancy' dismount-knockup or remount-charge; R 'Magnet Storm' AOE pull. (DDragon:champion:Rell)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Tank mythic — R team-fight pull", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her W-charge knockup or R-pull.", cite: "Rell W remount charges enemies; R pulls enemies repeatedly. (DDragon:champion:Rell, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Renata Glasc": {
    id: "Renata",
    name: "Renata Glasc",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Shielding", "CC-chain", "Engage"],
    coreBuild: [
      { position: "UTILITY", items: ["3504", "3158", "3107", "3222"], cite: "Renata Glasc poison-enchanter — R 'Hostile Takeover' AOE causes enemies to attack their own. (DDragon:champion:Renata)" },
    ],
    powerSpikes: [{ items: ["3504"], label: "Ardent — buff carry on-hit", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R berserk effect on hit allies.", cite: "Renata R applies Berserk to enemies, causing them to attack allies. (DDragon:champion:Renata, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Rumble: {
    id: "Rumble",
    name: "Rumble",
    positions: ["TOP", "MIDDLE"],
    intrinsicThreatTypes: ["AP-DoT", "AP-sustained", "CC-chain"],
    coreBuild: [
      { position: "TOP", items: ["6657", "3020", "4401", "3157"], cite: "Rumble heat-mech — passive 'Junkyard Titan' overheats abilities; R 'The Equalizer' AOE damage line. (DDragon:champion:Rumble)" },
    ],
    powerSpikes: [{ items: ["6657"], label: "Riftmaker — R team-fight zone", threatLevel: "high" }],
    counteredBy: [
      { itemId: "4401", reason: "Force of Nature against his sustained R-zone DoT.", cite: "Rumble R is a sustained AOE damage line. (DDragon:champion:Rumble, DDragon:4401)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Samira: {
    id: "Samira",
    name: "Samira",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-burst", "AD-attackspeed", "Engage"],
    coreBuild: [
      { position: "BOTTOM", items: ["6673", "3006", "3031", "3072"], cite: "Samira melee-ranged ADC — passive 'Daredevil Impulse' grants S-stack mechanic; R 'Inferno Trigger' AOE bullet hell at S-rank. (DDragon:champion:Samira)" },
    ],
    powerSpikes: [{ items: ["6673"], label: "Shieldbow — S-rank R unleashed", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3026", reason: "Guardian Angel — denies her R kill-pattern.", cite: "DDragon:3026" },
      { itemId: "3110", reason: "Frozen Heart — AS scaling DPS.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Seraphine: {
    id: "Seraphine",
    name: "Seraphine",
    positions: ["UTILITY", "MIDDLE", "BOTTOM"],
    intrinsicThreatTypes: ["Healing", "Shielding", "CC-chain"],
    coreBuild: [
      { position: "UTILITY", items: ["3504", "3158", "3107", "3222"], cite: "Seraphine note-stacking enchanter-mage — passive grants Echo bonus on every 3rd ability. (DDragon:champion:Seraphine)" },
    ],
    powerSpikes: [{ items: ["3504"], label: "Ardent — sustained team buff", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R (Encore) charm on multi-hop bounce.", cite: "Seraphine R fires a wave that charms; if it hits champions, it bounces further. (DDragon:champion:Seraphine, DDragon:3140)" },
      { itemId: "6695", reason: "Serpent's Fang shreds her E and W shields.", cite: "DDragon:6695" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Shyvana: {
    id: "Shyvana",
    name: "Shyvana",
    positions: ["JUNGLE", "TOP"],
    intrinsicThreatTypes: ["AD-sustained", "AD-attackspeed", "Engage"],
    coreBuild: [
      { position: "JUNGLE", items: ["6672", "3006", "3091", "3094"], cite: "Shyvana hybrid-AD jungler — R 'Dragon's Descent' transforms into dragon for amplified abilities. (DDragon:champion:Shyvana)" },
    ],
    powerSpikes: [{ items: ["6672"], label: "Kraken — sustained DPS in dragon form", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart — AS-stacking jungler.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Sivir: {
    id: "Sivir",
    name: "Sivir",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-sustained", "Shielding"],
    coreBuild: [
      { position: "BOTTOM", items: ["6671", "3006", "3094", "3031"], cite: "Sivir wave-clearing ADC — E 'Spell Shield' grants periodic spell-block; R 'On The Hunt' team MS for engage. (DDragon:champion:Sivir)" },
    ],
    powerSpikes: [{ items: ["6671"], label: "Mythic — R team mobility", threatLevel: "high" }],
    counteredBy: [
      { itemId: "6695", reason: "Serpent's Fang shreds her E spell-shield buff value.", cite: "Sivir E grants periodic spell shield. (DDragon:champion:Sivir, DDragon:6695)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Smolder: {
    id: "Smolder",
    name: "Smolder",
    positions: ["BOTTOM", "TOP"],
    intrinsicThreatTypes: ["AD-sustained", "Poke"],
    coreBuild: [
      { position: "BOTTOM", items: ["6671", "3006", "3115", "3036"], cite: "Smolder dragon-stack ADC — Q 'Super Scaler' permanently stacks AD per CS. (DDragon:champion:Smolder)" },
    ],
    powerSpikes: [{ items: ["3036"], label: "Lord Dominik's — late-game tank-shred", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart — sustained DPS pattern.", cite: "DDragon:3110" },
      { itemId: "3026", reason: "GA — denies the R execute on a peeled carry.", cite: "DDragon:3026" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Sona: {
    id: "Sona",
    name: "Sona",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Healing", "Shielding", "CC-chain"],
    coreBuild: [
      { position: "UTILITY", items: ["3504", "3158", "3107", "3222"], cite: "Sona aura-enchanter — Q-W-E grant ally auras; R 'Crescendo' AOE stun. (DDragon:champion:Sona)" },
    ],
    powerSpikes: [{ items: ["3504"], label: "Ardent — full team buff", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts her W AOE heal on the carry she protects.", cite: "Sona W heals self + nearby ally. (DDragon:champion:Sona, DDragon:3033)" },
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R AOE stun.", cite: "Sona R stuns all enemies in a long line. (DDragon:champion:Sona, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Swain: {
    id: "Swain",
    name: "Swain",
    positions: ["MIDDLE", "UTILITY", "TOP"],
    intrinsicThreatTypes: ["AP-DoT", "Healing", "AP-sustained"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "4633", "3089"], cite: "Swain demon-mage — passive 'Ravenous Flock' eats souls for permanent HP; R 'Demonic Ascension' drains nearby enemies. (DDragon:champion:Swain)" },
    ],
    powerSpikes: [{ items: ["3089"], label: "Rabadon's — sustained drain pattern", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3165", reason: "Morellonomicon — Swain's R is a passive drain heal that scales with damage. AP antiheal cuts it.", cite: "Swain R drains enemies, healing him. (DDragon:champion:Swain, DDragon:3165)" },
      { itemId: "3076", reason: "Bramble Vest for AD allies vs his sustain.", cite: "DDragon:3076" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Taric: {
    id: "Taric",
    name: "Taric",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Tank", "Healing", "CC-chain"],
    coreBuild: [
      { position: "UTILITY", items: ["3193", "3111", "3050", "3110"], cite: "Taric gem-paladin — Q 'Starlight's Touch' charge-heal; R 'Cosmic Radiance' grants invulnerability to allies. (DDragon:champion:Taric)" },
    ],
    powerSpikes: [{ items: ["3193"], label: "Stoneplate — frontline + R mythic", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts his Q heal — his core sustain mechanic.", cite: "Taric Q heals nearby allies. (DDragon:champion:Taric, DDragon:3033)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Trundle: {
    id: "Trundle",
    name: "Trundle",
    positions: ["TOP", "JUNGLE"],
    intrinsicThreatTypes: ["AD-sustained", "Healing", "Tank"],
    coreBuild: [
      { position: "TOP", items: ["6630", "3047", "3091", "3053"], cite: "Trundle troll-king — R 'Subjugate' steals stats from target; W 'Frozen Domain' grants AS + healing in zone. (DDragon:champion:Trundle)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic — duel pressure", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts his W zone-healing AND lifesteal.", cite: "Trundle W zone heals him + grants AS. (DDragon:champion:Trundle, DDragon:3033)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Urgot: {
    id: "Urgot",
    name: "Urgot",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-sustained", "AD-burst", "CC-chain"],
    coreBuild: [
      { position: "TOP", items: ["6630", "3047", "3071", "3053"], cite: "Urgot leg-cannon bruiser — passive shotgun-legs auto-attack on cooldown; R 'Fear Beyond Death' executes low-HP targets and fears nearby enemies. (DDragon:champion:Urgot)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic — full Q-W-R execute combo", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his E (Disdain) flip-knockdown.", cite: "Urgot E charges and flips a target behind him, knocking up. (DDragon:champion:Urgot, DDragon:3140)" },
      { itemId: "3026", reason: "GA — denies his R execute.", cite: "DDragon:3026" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Varus: {
    id: "Varus",
    name: "Varus",
    positions: ["BOTTOM", "MIDDLE"],
    intrinsicThreatTypes: ["AD-sustained", "Poke", "AD-burst"],
    coreBuild: [
      { position: "BOTTOM", items: ["6672", "3006", "3094", "3031"], cite: "Varus arrow-ADC — Q 'Piercing Arrow' charge-poke; R 'Chain of Corruption' AOE root-spreader. (DDragon:champion:Varus)" },
    ],
    powerSpikes: [{ items: ["6672"], label: "Kraken — full poke + on-hit", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R root spreader before it chains.", cite: "Varus R applies a root that spreads to nearby enemies. (DDragon:champion:Varus, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Vel'Koz": {
    id: "Velkoz",
    name: "Vel'Koz",
    positions: ["MIDDLE", "UTILITY"],
    intrinsicThreatTypes: ["AP-sustained", "Poke", "AP-DoT"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3089"], cite: "Vel'Koz true-damage mage — passive 'Organic Deconstruction' applies stacks; 3rd stack triggers true damage. (DDragon:champion:Velkoz)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R laser channel team-fight", threatLevel: "high" }],
    counteredBy: [
      { itemId: "4401", reason: "Force of Nature against his sustained ranged damage and channel R.", cite: "Vel'Koz R channels a sustained laser dealing magic damage. (DDragon:champion:Velkoz, DDragon:4401)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Xayah: {
    id: "Xayah",
    name: "Xayah",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-sustained", "AD-attackspeed", "CC-chain"],
    coreBuild: [
      { position: "BOTTOM", items: ["6672", "3006", "3094", "3031"], cite: "Xayah feather ADC — passive scatter feathers; E 'Bladecaller' recalls feathers, rooting enemies hit by 3+. (DDragon:champion:Xayah)" },
    ],
    powerSpikes: [{ items: ["6672"], label: "Kraken — feather + DPS pattern", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart — AS scaling.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Xerath: {
    id: "Xerath",
    name: "Xerath",
    positions: ["MIDDLE", "UTILITY"],
    intrinsicThreatTypes: ["Poke", "AP-burst", "AP-sustained"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3089"], cite: "Xerath artillery mage — Q 'Arcanopulse' charge-poke; R 'Rite of the Arcane' global cannon. (DDragon:champion:Xerath)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R global execute", threatLevel: "high" }],
    counteredBy: [
      { itemId: "4401", reason: "Force of Nature for sustained poke comp.", cite: "DDragon:4401" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Yuumi: {
    id: "Yuumi",
    name: "Yuumi",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Healing", "Shielding"],
    coreBuild: [
      { position: "UTILITY", items: ["3504", "3158", "3107", "3222"], cite: "Yuumi attached enchanter — passive grants ally heal/buff; W 'You and Me!' attaches to ally. (DDragon:champion:Yuumi)" },
    ],
    powerSpikes: [{ items: ["3504"], label: "Ardent — sustained ally buff", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts her R AOE heal AND her empowered Q heal-on-hit.", cite: "Yuumi R waves heal allies; empowered abilities deal damage. (DDragon:champion:Yuumi, DDragon:3033)" },
      { itemId: "3165", reason: "Morellonomicon for AP allies.", cite: "DDragon:3165" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Zeri: {
    id: "Zeri",
    name: "Zeri",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-attackspeed", "AD-sustained", "Roam"],
    coreBuild: [
      { position: "BOTTOM", items: ["6672", "3006", "3094", "3031"], cite: "Zeri high-mobility ADC — Q empowers next auto with on-hit; passive 'Living Battery' grants shield from ally shields. (DDragon:champion:Zeri)" },
    ],
    powerSpikes: [{ items: ["6672"], label: "Kraken — full DPS on the move", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart — pure AS scaling.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Ziggs: {
    id: "Ziggs",
    name: "Ziggs",
    positions: ["MIDDLE", "BOTTOM"],
    intrinsicThreatTypes: ["AP-burst", "Poke", "Engage"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3089"], cite: "Ziggs bomb-mage — passive 'Short Fuse' empowers every 12th basic; R 'Mega Inferno Bomb' global execute. (DDragon:champion:Ziggs)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R execute threat", threatLevel: "high" }],
    counteredBy: [
      { itemId: "4401", reason: "Force of Nature for poke matchup.", cite: "DDragon:4401" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Zilean: {
    id: "Zilean",
    name: "Zilean",
    positions: ["UTILITY", "MIDDLE"],
    intrinsicThreatTypes: ["Shielding", "CC-chain"],
    coreBuild: [
      { position: "UTILITY", items: ["3158", "3504", "3107", "3222"], cite: "Zilean time-warper — R 'Chronoshift' resurrects target ally on death. (DDragon:champion:Zilean)" },
    ],
    powerSpikes: [{ items: ["3504"], label: "Ardent — utility scaling", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his Q-E bomb-stun on hit.", cite: "Zilean Q + E combo applies a delayed stun. (DDragon:champion:Zilean, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Zyra: {
    id: "Zyra",
    name: "Zyra",
    positions: ["UTILITY", "MIDDLE"],
    intrinsicThreatTypes: ["AP-DoT", "CC-chain", "Poke"],
    coreBuild: [
      { position: "UTILITY", items: ["6655", "3158", "3135", "3089"], cite: "Zyra plant-mage — Q-W combo seeds plants for damage; R 'Stranglethorns' AOE delayed knockup. (DDragon:champion:Zyra)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R AOE knockup", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R knockup.", cite: "Zyra R AOE-roots then knocks up enemies in radius. (DDragon:champion:Zyra, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Twisted Fate": {
    id: "TwistedFate",
    name: "Twisted Fate",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "Roam", "CC-chain"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3089"], cite: "Twisted Fate global roamer — R 'Destiny' reveals + teleports him anywhere. (DDragon:champion:TwistedFate)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — global R map pressure", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his W (Pick a Card) Gold-card stun.", cite: "TF W picks a card with bonuses; gold card stuns. (DDragon:champion:TwistedFate, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Vex: {
    id: "Vex",
    name: "Vex",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Roam"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3157", "3135"], cite: "Vex anti-mobility mage — passive 'Doom 'n Gloom' marks dashing enemies for bonus damage. (DDragon:champion:Vex)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R execute combo", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3102", reason: "Banshee's Veil spell-shield blocks her E (Personal Space) damage zone.", cite: "DDragon:3102" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Viktor: {
    id: "Viktor",
    name: "Viktor",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-sustained", "AP-burst", "CC-chain"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3089"], cite: "Viktor evolves abilities through his Hex Core — Q-W-E augments scale his kit. (DDragon:champion:Viktor)" },
    ],
    powerSpikes: [{ items: ["6655", "3089"], label: "Mythic + Rabadon's — full evolved kit", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3102", reason: "Banshee's Veil spell-shield blocks his W (Gravity Field) stun on stack-trigger.", cite: "Viktor W is a delayed-stun zone. (DDragon:champion:Viktor, DDragon:3102)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Vladimir: {
    id: "Vladimir",
    name: "Vladimir",
    positions: ["MIDDLE", "TOP"],
    intrinsicThreatTypes: ["Healing", "AP-sustained", "Tank"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "4633", "3157"], cite: "Vladimir scaling AP — Q heals, W untargetable pool, R amps damage taken on enemies. (DDragon:champion:Vladimir)" },
    ],
    powerSpikes: [{ items: ["3157"], label: "Zhonya's — full extended-fight sustain", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3165", reason: "Morellonomicon — Vladimir's Q heal is the foundation of his kit; AP antiheal cuts it directly.", cite: "Vladimir Q heals on champion hit. (DDragon:champion:Vladimir, DDragon:3165)" },
      { itemId: "3076", reason: "Bramble Vest for armor-stacking allies — same effect via on-receive antiheal.", cite: "DDragon:3076" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Zoe: {
    id: "Zoe",
    name: "Zoe",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Roam"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3157", "3089"], cite: "Zoe burst-mage — passive 'More Sparkles!' empowers next basic; R 'Portal Jump' brief blink + recall. (DDragon:champion:Zoe)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — Q + sleeper one-shot", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3102", reason: "Banshee's Veil spell-shield blocks her E (Sleepy Trouble Bubble) sleep — her entire kill combo opens with the bubble.", cite: "Zoe E is a single-target sleep-projectile. (DDragon:champion:Zoe, DDragon:3102)" },
      { itemId: "3140", reason: "Quicksilver Sash cleanses the sleep if it lands.", cite: "DDragon:3140" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Corki: {
    id: "Corki",
    name: "Corki",
    positions: ["MIDDLE", "BOTTOM"],
    intrinsicThreatTypes: ["AD-sustained", "Poke"],
    coreBuild: [
      { position: "MIDDLE", items: ["3508", "3006", "3094", "3031"], cite: "Corki hybrid mage-ADC — passive 'Hextech Munitions' grants magic damage on autos; package empowers W. (DDragon:champion:Corki)" },
    ],
    powerSpikes: [{ items: ["3508"], label: "Essence Reaver — R poke threat", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3091", reason: "Wit's End for hybrid damage — his autos do magic + physical, MR helps.", cite: "DDragon:3091" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Fizz: {
    id: "Fizz",
    name: "Fizz",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "Roam"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3157", "3089"], cite: "Fizz dive-assassin — E 'Playful/Trickster' is a brief untargetable pool-dive. (DDragon:champion:Fizz)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R fish-engage burst", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R (Chum the Waters) fish-attached lockdown.", cite: "Fizz R attaches a fish to a target, drawing a shark + AOE damage. (DDragon:champion:Fizz, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Hwei: {
    id: "Hwei",
    name: "Hwei",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Poke"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3089"], cite: "Hwei dual-cast mage — Q-W-E split into 3 sub-spells each, allowing flexible composition. (DDragon:champion:Hwei)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R pacifier zone", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R (Spiraling Despair) AOE zone.", cite: "DDragon:3140" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Lissandra: {
    id: "Lissandra",
    name: "Lissandra",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Engage"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3157", "3135"], cite: "Lissandra ice mage — R 'Frozen Tomb' freezes self or enemy in untargetable stasis. (DDragon:champion:Lissandra)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R lockdown engage", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R-ice on target.", cite: "Lissandra R encases target in ice (stun) or grants her stasis. (DDragon:champion:Lissandra, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Neeko: {
    id: "Neeko",
    name: "Neeko",
    positions: ["MIDDLE", "UTILITY"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Engage"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3157", "3135"], cite: "Neeko shape-shifter — passive 'Inherent Glamour' lets her disguise as ally champions. (DDragon:champion:Neeko)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R team-fight bloom", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R (Pop Blossom) AOE root if you're caught.", cite: "Neeko R AOE roots after channel. (DDragon:champion:Neeko, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Ryze: {
    id: "Ryze",
    name: "Ryze",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-sustained", "AP-burst", "CC-chain"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3089"], cite: "Ryze rune-mage — Q 'Overload' charges next ability via E mark. (DDragon:champion:Ryze)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R team-teleport flank", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3102", reason: "Banshee's Veil spell-shield blocks his W (Rune Prison) root.", cite: "Ryze W roots a target. (DDragon:champion:Ryze, DDragon:3102)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Taliyah: {
    id: "Taliyah",
    name: "Taliyah",
    positions: ["MIDDLE", "JUNGLE"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Engage"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3157"], cite: "Taliyah stoneweaver — W 'Seismic Shove' delayed knockup; R 'Weaver's Wall' map-traversal wall. (DDragon:champion:Taliyah)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — full team-fight rotation", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her W knockup.", cite: "DDragon:3140" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Lillia: {
    id: "Lillia",
    name: "Lillia",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AP-DoT", "AP-sustained"],
    coreBuild: [
      { position: "JUNGLE", items: ["6657", "3020", "3157", "4637"], cite: "Lillia DoT bruiser-jungle — passive applies stacking magic damage; R 'Lilting Lullaby' sleeps marked enemies. (DDragon:champion:Lillia)" },
    ],
    powerSpikes: [{ items: ["6657"], label: "Riftmaker — sustained DoT", threatLevel: "high" }],
    counteredBy: [
      { itemId: "4401", reason: "Force of Nature scales with her sustained DoT damage.", cite: "DDragon:4401" },
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R sleep.", cite: "DDragon:3140" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Naafiri: {
    id: "Naafiri",
    name: "Naafiri",
    positions: ["MIDDLE", "JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "Roam"],
    coreBuild: [
      { position: "MIDDLE", items: ["6692", "3047", "3142", "6694"], cite: "Naafiri pack assassin — passive summons companion hounds; R 'The Call of the Pack' grants vision + speed for picks. (DDragon:champion:Naafiri)" },
    ],
    powerSpikes: [{ items: ["6692"], label: "Mythic — R pickoff with hounds", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3026", reason: "Guardian Angel revives squishies after her dash-burst combo.", cite: "DDragon:3026" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Rammus: {
    id: "Rammus",
    name: "Rammus",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["Tank", "Engage", "CC-chain"],
    coreBuild: [
      { position: "JUNGLE", items: ["3068", "3047", "3110", "3193"], cite: "Rammus tank — Q 'Powerball' charge engage; W 'Defensive Ball Curl' returns damage on autos. (DDragon:champion:Rammus)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Tank mythic — gank engage threat", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his Q (Powerball) charge knockup.", cite: "Rammus Q ends in a knockup. (DDragon:champion:Rammus, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Shaco: {
    id: "Shaco",
    name: "Shaco",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Roam"],
    coreBuild: [
      { position: "JUNGLE", items: ["6691", "3142", "3047", "6694"], cite: "Shaco trickster assassin — Q 'Deceive' stealth-blink; W places stealth-jack-in-the-box. (DDragon:champion:Shaco)" },
    ],
    powerSpikes: [{ items: ["6691"], label: "Mythic — gank pickoff", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3026", reason: "Guardian Angel for the carry he stealth-bursts.", cite: "DDragon:3026" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Skarner: {
    id: "Skarner",
    name: "Skarner",
    positions: ["JUNGLE", "TOP"],
    intrinsicThreatTypes: ["AD-sustained", "Engage", "CC-chain"],
    coreBuild: [
      { position: "JUNGLE", items: ["6630", "3047", "3071", "3053"], cite: "Skarner crystal-driller — R 'Impale' single-target suppression-drag carries away. (DDragon:champion:Skarner)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic — R kidnap pickoff", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R suppression — the only counter to the carry-kidnap.", cite: "Skarner R suppresses target and drags. (DDragon:champion:Skarner, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Udyr: {
    id: "Udyr",
    name: "Udyr",
    positions: ["JUNGLE", "TOP"],
    intrinsicThreatTypes: ["AD-sustained", "AD-attackspeed", "Engage", "Healing"],
    coreBuild: [
      { position: "JUNGLE", items: ["6630", "3047", "3091", "3053"], cite: "Udyr stance-shifter — Q-W-E-R cycle through tiger/turtle/bear/phoenix forms. (DDragon:champion:Udyr)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic — gank dive pattern", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts his W (Wilding Claw) shield + W stance heals.", cite: "Udyr W in turtle stance shields and grants on-hit damage. (DDragon:champion:Udyr, DDragon:3033)" },
      { itemId: "3110", reason: "Frozen Heart vs his AS-stacking phoenix stance.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Zac: {
    id: "Zac",
    name: "Zac",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["Tank", "Engage", "CC-chain"],
    coreBuild: [
      { position: "JUNGLE", items: ["3068", "3047", "3193", "3742"], cite: "Zac engage tank — passive splits into blobs at low HP; R 'Let's Bounce' is a multi-knockup AOE. (DDragon:champion:Zac)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Tank mythic — R team-fight engage", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his E (Elastic Slingshot) charge knockup.", cite: "Zac E is a chargeable jump that knocks up. (DDragon:champion:Zac, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Aphelios: {
    id: "Aphelios",
    name: "Aphelios",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-sustained", "AD-attackspeed", "Poke"],
    coreBuild: [
      { position: "BOTTOM", items: ["6672", "3006", "3094", "3031"], cite: "Aphelios 5-weapon ADC — passive cycles weapons; each grants different on-hit pattern. (DDragon:champion:Aphelios)" },
    ],
    powerSpikes: [{ items: ["6672"], label: "Kraken — full weapon-rotation DPS", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart — pure AS scaling.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Draven: {
    id: "Draven",
    name: "Draven",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-burst", "AD-sustained"],
    coreBuild: [
      { position: "BOTTOM", items: ["6673", "3006", "3031", "6676"], cite: "Draven crit-axe ADC — Q 'Spinning Axe' grants permanent stacking AD per axe-catch. (DDragon:champion:Draven)" },
    ],
    powerSpikes: [{ items: ["6673"], label: "Shieldbow — survival + crit ramp", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3026", reason: "Guardian Angel — Draven's R (Whirling Death) is a global execute that GA-revive denies.", cite: "Draven R fires a global axe that boomerangs. (DDragon:champion:Draven, DDragon:3026)" },
      { itemId: "3110", reason: "Frozen Heart — sustained crit DPS.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Kalista: {
    id: "Kalista",
    name: "Kalista",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-attackspeed", "AD-sustained", "Poke"],
    coreBuild: [
      { position: "BOTTOM", items: ["6672", "3006", "3094", "3031"], cite: "Kalista spear-hopping ADC — passive 'Martial Poise' lets her hop on basic-attacks. (DDragon:champion:Kalista)" },
    ],
    powerSpikes: [{ items: ["6672"], label: "Kraken — sustained DPS pattern", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart — AS-scaling kiting carry.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Kog'Maw": {
    id: "KogMaw",
    name: "Kog'Maw",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-attackspeed", "Poke", "Tank"],
    coreBuild: [
      { position: "BOTTOM", items: ["6672", "3006", "3091", "3094"], cite: "Kog'Maw on-hit hyper-carry — W 'Bio-Arcane Barrage' grants extreme range + on-hit % max-HP magic damage. (DDragon:champion:KogMaw)" },
    ],
    powerSpikes: [{ items: ["6672"], label: "Kraken — late-game tank-shredder", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart — pure AS scaling.", cite: "DDragon:3110" },
      { itemId: "3026", reason: "Guardian Angel — peels for him are vital; once he dies, the team-fight ends.", cite: "DDragon:3026" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Twitch: {
    id: "Twitch",
    name: "Twitch",
    positions: ["BOTTOM", "JUNGLE"],
    intrinsicThreatTypes: ["AD-attackspeed", "AD-sustained", "Roam"],
    coreBuild: [
      { position: "BOTTOM", items: ["6672", "3006", "3072", "3094"], cite: "Twitch poison-stalker — passive 'Deadly Venom' stacking DoT; Q 'Ambush' grants invisibility. (DDragon:champion:Twitch)" },
    ],
    powerSpikes: [{ items: ["6672"], label: "Kraken — R AoE devastation", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart — AS scaling DPS.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Evelynn: {
    id: "Evelynn",
    name: "Evelynn",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AP-burst", "Roam"],
    coreBuild: [
      { position: "JUNGLE", items: ["6655", "3020", "3157", "4645"], cite: "Evelynn AP assassin — passive 'Demon Shade' grants stealth at level 6 when out of combat. (DDragon:champion:Evelynn)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic up — R execute combo", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R (Last Caress) damage zone if you're caught.", cite: "DDragon:3140" },
      { itemId: "3157", reason: "Zhonya's stasis through her R execution.", cite: "DDragon:3157" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Fiddlesticks: {
    id: "Fiddlesticks",
    name: "Fiddlesticks",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Engage"],
    coreBuild: [
      { position: "JUNGLE", items: ["6655", "3020", "3135", "3157"], cite: "Fiddlesticks AP team-fight — R 'Crowstorm' channels into AOE flock. (DDragon:champion:Fiddlesticks)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R team-fight burst zone", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his Q (Terrify) fear.", cite: "Fiddlesticks Q fears target if facing away. (DDragon:champion:Fiddlesticks, DDragon:3140)" },
      { itemId: "3814", reason: "Edge of Night blocks his R initiation if you spot the ult cast.", cite: "DDragon:3814" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Graves: {
    id: "Graves",
    name: "Graves",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "AD-sustained"],
    coreBuild: [
      { position: "JUNGLE", items: ["3142", "3158", "6694", "3072"], cite: "Graves shotgun jungler — passive grants armor stacking + double-shot reload. (DDragon:champion:Graves)" },
    ],
    powerSpikes: [{ items: ["3142"], label: "Lethality mythic — gank burst online", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3047", reason: "Plated Steelcaps reduces his auto-attack double-shot damage.", cite: "DDragon:3047" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Ivern: {
    id: "Ivern",
    name: "Ivern",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["Shielding", "CC-chain"],
    coreBuild: [
      { position: "JUNGLE", items: ["3504", "3158", "3107", "3222"], cite: "Ivern enchanter jungler — Q 'Rootcaller' roots a target; W creates brush; E shields ally. (DDragon:champion:Ivern)" },
    ],
    powerSpikes: [{ items: ["3504"], label: "Ardent — carry hyperscaling", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "6695", reason: "Serpent's Fang shreds his E shields on his protected carry.", cite: "Ivern E grants ally shield. (DDragon:champion:Ivern, DDragon:6695)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Kayn: {
    id: "Kayn",
    name: "Kayn",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Engage"],
    coreBuild: [
      { position: "JUNGLE", items: ["6692", "3047", "3071", "3053"], cite: "Kayn form-swap — Rhaast (red) is sustain bruiser; Shadow (blue) is assassin lethality. (DDragon:champion:Kayn)" },
    ],
    powerSpikes: [{ items: ["6692"], label: "Mythic + form-evolve — ult assassinations", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R (Umbral Trespass) suppress on the carry.", cite: "Kayn R enters the target body and exits with damage. (DDragon:champion:Kayn, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Kindred: {
    id: "Kindred",
    name: "Kindred",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-attackspeed", "AD-sustained"],
    coreBuild: [
      { position: "JUNGLE", items: ["6672", "3006", "3094", "3031"], cite: "Kindred ADC-style jungler — passive 'Mark of the Kindred' grants AD per mark stack. (DDragon:champion:Kindred)" },
    ],
    powerSpikes: [{ items: ["6672"], label: "Kraken — DPS unlocked", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart — pure AS scaling.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Nidalee: {
    id: "Nidalee",
    name: "Nidalee",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AP-burst", "Poke", "Roam"],
    coreBuild: [
      { position: "JUNGLE", items: ["6655", "3158", "3157", "3089"], cite: "Nidalee form-swap AP — human Q is long-range spear; cougar form is melee gap-close. (DDragon:champion:Nidalee)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — Q spear one-shots squishies", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3814", reason: "Edge of Night spell-shield blocks her Q spear (the only counter to her one-shot).", cite: "Nidalee Q is a long-range skillshot scaling damage with travel. (DDragon:champion:Nidalee, DDragon:3814)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Nocturne: {
    id: "Nocturne",
    name: "Nocturne",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "Roam"],
    coreBuild: [
      { position: "JUNGLE", items: ["6692", "3047", "3071", "3072"], cite: "Nocturne global assassin — R 'Paranoia' blinds enemy team and dashes to target. (DDragon:champion:Nocturne)" },
    ],
    powerSpikes: [{ items: ["6692"], label: "Mythic — global R pickoff", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3814", reason: "Edge of Night spell-shield blocks his Q (Duskbringer) spear.", cite: "Nocturne Q fires a damage trail along ground. (DDragon:champion:Nocturne, DDragon:3814)" },
      { itemId: "3140", reason: "Quicksilver Sash cleanses his fear-on-Spell-Shield-break, R-blind, or chain CC.", cite: "DDragon:3140" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Rengar: {
    id: "Rengar",
    name: "Rengar",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Roam"],
    coreBuild: [
      { position: "JUNGLE", items: ["6691", "3142", "3047", "6694"], cite: "Rengar pounce assassin — R 'Thrill of the Hunt' camouflages + targets a champion to leap from out of brush. (DDragon:champion:Rengar)" },
    ],
    powerSpikes: [{ items: ["6691"], label: "Mythic — leap-burst combo", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3026", reason: "Guardian Angel revives the carry he leaps onto.", cite: "DDragon:3026" },
      { itemId: "3814", reason: "Edge of Night blocks the Empowered W stun.", cite: "DDragon:3814" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Sejuani: {
    id: "Sejuani",
    name: "Sejuani",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["Tank", "CC-chain", "Engage"],
    coreBuild: [
      { position: "JUNGLE", items: ["3068", "3111", "3193", "3742"], cite: "Sejuani tank engage — R 'Glacial Prison' is a long-range ice spear stun. (DDragon:champion:Sejuani)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Tank mythic — engage threat", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R spear stun and W (Winter's Wrath) follow-up.", cite: "Sejuani R fires a long-range stun spear. (DDragon:champion:Sejuani, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Viego: {
    id: "Viego",
    name: "Viego",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Healing", "Roam"],
    coreBuild: [
      { position: "JUNGLE", items: ["6630", "3047", "3071", "3053"], cite: "Viego possession-assassin — passive 'Sovereign's Domination' lets him take over slain champions briefly. (DDragon:champion:Viego)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic — possession reset combos", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts his W heal on autos to passive-marked targets.", cite: "Viego passive heals on auto-attacks to enemies marked by Sovereign's Domination. (DDragon:champion:Viego, DDragon:3033)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Xin Zhao": {
    id: "XinZhao",
    name: "Xin Zhao",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "AD-sustained"],
    coreBuild: [
      { position: "JUNGLE", items: ["6630", "3047", "3071", "3053"], cite: "Xin Zhao bruiser — Q 'Three Talon Strike' 3rd-hit knockup; W creates a long-range damage zone. (DDragon:champion:XinZhao)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic — gank burst combo", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his Q knockup.", cite: "DDragon:3140" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Aurelion Sol": {
    id: "AurelionSol",
    name: "Aurelion Sol",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-sustained", "Poke", "Tank"],
    coreBuild: [
      { position: "MIDDLE", items: ["6657", "3020", "3135", "3089"], cite: "Aurelion Sol stardust mage — passive 'Cosmic Creator' permanently scales his abilities with stardust stacks. (DDragon:champion:AurelionSol)" },
    ],
    powerSpikes: [{ items: ["3089"], label: "Rabadon's — late-game scaling explosion", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "4401", reason: "Force of Nature scales with sustained AP — perfect counter to his stardust ramp pattern.", cite: "DDragon:4401" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Azir: {
    id: "Azir",
    name: "Azir",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-sustained", "Poke", "AD-attackspeed"],
    coreBuild: [
      { position: "MIDDLE", items: ["3508", "3020", "3115", "3089"], cite: "Azir soldier-control mage — Q-W-E soldier dance for sustained DPS. (DDragon:champion:Azir)" },
    ],
    powerSpikes: [{ items: ["3115"], label: "Nashor's — soldier on-hit damage", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R (Emperor's Divide) wall knockback.", cite: "Azir R summons soldiers in a line, knocking back enemies. (DDragon:champion:Azir, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Galio: {
    id: "Galio",
    name: "Galio",
    positions: ["MIDDLE", "UTILITY"],
    intrinsicThreatTypes: ["Tank", "Engage", "CC-chain"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "4401", "3157"], cite: "Galio AP tank — R 'Hero's Entrance' is a global fly-engage knock-up. (DDragon:champion:Galio)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R global engage", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R-arrival knockup.", cite: "Galio R knocks up enemies on landing. (DDragon:champion:Galio, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Katarina: {
    id: "Katarina",
    name: "Katarina",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "Roam"],
    coreBuild: [
      { position: "MIDDLE", items: ["6657", "3020", "3157", "3089"], cite: "Katarina dagger-reset assassin — picks up daggers to reset cooldowns + R 'Death Lotus' channel-burst. (DDragon:champion:Katarina)" },
    ],
    powerSpikes: [{ items: ["6657"], label: "Mythic — R reset combos", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses CC during her R channel — she's vulnerable while channeling.", cite: "Katarina R channels and deals AOE damage. (DDragon:champion:Katarina, DDragon:3140)" },
      { itemId: "3157", reason: "Zhonya's Hourglass through her R channel — survive then peel.", cite: "DDragon:3157" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Malzahar: {
    id: "Malzahar",
    name: "Malzahar",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["CC-chain", "AP-burst", "AP-DoT"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3089"], cite: "Malzahar control-mage — passive 'Void Shift' periodic spell-shield + R 'Nether Grasp' single-target suppression. (DDragon:champion:Malzahar)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R single-target lockdown", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R suppression — the only counter to a Malzahar ult that lands.", cite: "Malzahar R suppresses target for 2.5 seconds. QSS cleanses suppression. (DDragon:champion:Malzahar, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Orianna: {
    id: "Orianna",
    name: "Orianna",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Shielding"],
    coreBuild: [
      { position: "MIDDLE", items: ["6655", "3020", "3135", "3089"], cite: "Orianna ball-controller — R 'Command: Shockwave' is a delayed AOE knockup ult. (DDragon:champion:Orianna)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic — R team-fight initiation", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R knockup if you're caught.", cite: "Orianna R pulls enemies and knocks them up. (DDragon:champion:Orianna, DDragon:3140)" },
      { itemId: "6695", reason: "Serpent's Fang shreds her E (Command: Protect) ally shields.", cite: "Orianna E shields the targeted ally. (DDragon:champion:Orianna, DDragon:6695)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Sylas: {
    id: "Sylas",
    name: "Sylas",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-sustained", "Engage", "Healing"],
    coreBuild: [
      { position: "MIDDLE", items: ["6657", "3020", "3157", "3089"], cite: "Sylas AP bruiser — R 'Hijack' steals enemy ult. (DDragon:champion:Sylas)" },
    ],
    powerSpikes: [{ items: ["6657"], label: "Riftmaker — sustain AP burst", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3076", reason: "Bramble Vest cuts his W (Kingslayer) heal on low-HP target.", cite: "Sylas W heals scaling with target's missing HP. (DDragon:champion:Sylas, DDragon:3076)" },
      { itemId: "3033", reason: "Mortal Reminder for AD allies vs his W heal.", cite: "DDragon:3033" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Talon: {
    id: "Talon",
    name: "Talon",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AD-burst", "Roam"],
    coreBuild: [
      { position: "MIDDLE", items: ["3142", "3158", "6691", "6694"], cite: "Talon lethality assassin — passive grants bleed damage on 3-stack autos; R 'Shadow Assault' AOE blade rings. (DDragon:champion:Talon)" },
    ],
    powerSpikes: [{ items: ["3142"], label: "Lethality mythic — R combo lethal", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3026", reason: "Guardian Angel revives squishies in his R execute window.", cite: "DDragon:3026" },
      { itemId: "3157", reason: "Zhonya's stasis interrupts his combo.", cite: "DDragon:3157" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Ornn: {
    id: "Ornn",
    name: "Ornn",
    positions: ["TOP"],
    intrinsicThreatTypes: ["Tank", "CC-chain", "Engage"],
    coreBuild: [
      { position: "TOP", items: ["3068", "3111", "3193", "4401"], cite: "Ornn tank with item-upgrade utility — passive 'Living Forge' lets him upgrade ally items in lane. (DDragon:champion:Ornn)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Tank mythic — engage threat", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R (Call of the Forge God) — the second-cast knockup is Ornn's hardest CC.", cite: "Ornn R fires elemental wave; recast knockups enemies hit. (DDragon:champion:Ornn, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Pantheon: {
    id: "Pantheon",
    name: "Pantheon",
    positions: ["TOP", "UTILITY"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "CC-chain"],
    coreBuild: [
      { position: "TOP", items: ["3142", "3047", "3071", "3053"], cite: "Pantheon spear lethality — passive 'Mortal Will' empowers next ability after 5 ability uses. (DDragon:champion:Pantheon)" },
    ],
    powerSpikes: [{ items: ["3142"], label: "Lethality mythic — Q burst lethal on squishies", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3814", reason: "Edge of Night spell-shield blocks his W (Shield Vault) point-and-click stun.", cite: "Pantheon W is a point-and-click stun-leap. (DDragon:champion:Pantheon, DDragon:3814)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Poppy: {
    id: "Poppy",
    name: "Poppy",
    positions: ["TOP", "UTILITY", "JUNGLE"],
    intrinsicThreatTypes: ["Tank", "CC-chain", "Engage"],
    coreBuild: [
      { position: "TOP", items: ["3068", "3047", "3193", "3742"], cite: "Poppy tank with W passive granting MR/Armor + dash interrupt. (DDragon:champion:Poppy)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Tank mythic — frontline + W dash-block", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her R (Keeper's Verdict) channel-knockback.", cite: "Poppy R charges then knocks back enemies in a line. (DDragon:champion:Poppy, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Renekton: {
    id: "Renekton",
    name: "Renekton",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "AD-sustained"],
    coreBuild: [
      { position: "TOP", items: ["6630", "3047", "3071", "3053"], cite: "Renekton lane bully — Fury-empowered abilities for sustain + burst windows. (DDragon:champion:Renekton)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic up — all-in pressure", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3076", reason: "Bramble Vest — Renekton's empowered W heals; antiheal cuts the sustain.", cite: "Renekton empowered W heals on champion hit. (DDragon:champion:Renekton, DDragon:3076)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Shen: {
    id: "Shen",
    name: "Shen",
    positions: ["TOP", "UTILITY"],
    intrinsicThreatTypes: ["Tank", "Shielding", "Engage"],
    coreBuild: [
      { position: "TOP", items: ["3068", "3111", "3193", "3742"], cite: "Shen tank with global ult-shield — R 'Stand United' shields a teammate then teleports to them. (DDragon:champion:Shen)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Tank mythic — global presence", threatLevel: "high" }],
    counteredBy: [
      { itemId: "6695", reason: "Serpent's Fang shreds his R team-shield — denies the late-game bail.", cite: "Shen R applies a shield to the targeted ally. (DDragon:champion:Shen, DDragon:6695)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Sion: {
    id: "Sion",
    name: "Sion",
    positions: ["TOP"],
    intrinsicThreatTypes: ["Tank", "CC-chain", "Engage"],
    coreBuild: [
      { position: "TOP", items: ["3068", "3047", "3742", "3193"], cite: "Sion tank — passive 'Glory in Death' grants temp life after death; R 'Unstoppable Onslaught' is a charge engage. (DDragon:champion:Sion)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Sunfire — frontline durability", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his Q (Decimating Smash) charged knockup OR R-knockup if landed.", cite: "Sion Q is a charged AOE knockup. (DDragon:champion:Sion, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Singed: {
    id: "Singed",
    name: "Singed",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AP-DoT", "Tank", "Healing"],
    coreBuild: [
      { position: "TOP", items: ["6657", "3047", "3742", "4401"], cite: "Singed runner-tank — Q 'Poison Trail' applies stacking DoT in his wake. (DDragon:champion:Singed)" },
    ],
    powerSpikes: [{ items: ["6657"], label: "Riftmaker — DoT amp + omnivamp", threatLevel: "high" }],
    counteredBy: [
      { itemId: "4401", reason: "Force of Nature scales MR with sustained magic damage taken — perfect counter to his Q DoT trail.", cite: "Singed Q is a sustained DoT zone. (DDragon:champion:Singed, DDragon:4401)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Tahm Kench": {
    id: "TahmKench",
    name: "Tahm Kench",
    positions: ["TOP", "UTILITY"],
    intrinsicThreatTypes: ["Tank", "CC-chain"],
    coreBuild: [
      { position: "TOP", items: ["3068", "3047", "3193", "3065"], cite: "Tahm Kench HP-tank — W 'Devour' eats ally/enemy; Q 'Tongue Lash' stuns at 3 stacks via passive. (DDragon:champion:TahmKench)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Tank mythic — W body-block tankiness", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3036", reason: "Lord Dominik's punishes his stacked HP.", cite: "DDragon:3036" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Teemo: {
    id: "Teemo",
    name: "Teemo",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AP-DoT", "Poke"],
    coreBuild: [
      { position: "TOP", items: ["6655", "3020", "3115", "3089"], cite: "Teemo on-hit AP — passive 'Guerrilla Warfare' camouflages stationary; auto-attacks deal magic damage with E DoT. (DDragon:champion:Teemo)" },
    ],
    powerSpikes: [{ items: ["3115"], label: "Nashor's — on-hit DoT scaling", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "4401", reason: "Force of Nature — his on-hit poison is sustained magic damage.", cite: "Teemo E 'Toxic Shot' applies a magic-damage DoT. (DDragon:champion:Teemo, DDragon:4401)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Tryndamere: {
    id: "Tryndamere",
    name: "Tryndamere",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-attackspeed", "AD-sustained", "Healing"],
    coreBuild: [
      { position: "TOP", items: ["6673", "3006", "3046", "3031", "3072"], cite: "Tryndamere crit duelist — passive Bloodlust grants AD per fury stack; R 'Undying Rage' grants 5s death immunity. (DDragon:champion:Tryndamere)" },
    ],
    powerSpikes: [{ items: ["6673"], label: "Shieldbow — sustain + crit unlock", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart attack-speed slow neuters his AS-scaling crit DPS.", cite: "DDragon:3110" },
      { itemId: "3033", reason: "Mortal Reminder cuts his Q (Bloodlust) heal — Q heals based on missing HP and crit chance.", cite: "Tryndamere Q heals scaling with crit chance. (DDragon:champion:Tryndamere, DDragon:3033)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Volibear: {
    id: "Volibear",
    name: "Volibear",
    positions: ["TOP", "JUNGLE"],
    intrinsicThreatTypes: ["Engage", "CC-chain", "AD-sustained"],
    coreBuild: [
      { position: "TOP", items: ["6630", "3047", "3071", "3053"], cite: "Volibear bruiser — Q 'Thundering Smash' grants charge + slow immunity, into auto-attack stun. (DDragon:champion:Volibear)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic up — engage threat", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his Q-stun lockdown.", cite: "Volibear Q-charge ends in a stun on auto-attack. (DDragon:champion:Volibear, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Wukong: {
    id: "MonkeyKing",
    name: "Wukong",
    positions: ["TOP", "JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "CC-chain"],
    coreBuild: [
      { position: "TOP", items: ["6630", "3047", "3071", "3053"], cite: "Wukong skirmisher — passive 'Stone Skin' grants armor scaling; R 'Cyclone' is a multi-knockup spin. (DDragon:champion:MonkeyKing)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic up — R team-fight knockup chain", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R knockup chain.", cite: "Wukong R knocks up multiple enemies. (DDragon:champion:MonkeyKing, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Yorick: {
    id: "Yorick",
    name: "Yorick",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-sustained", "Engage", "Tank"],
    coreBuild: [
      { position: "TOP", items: ["6630", "3047", "3071", "3053"], cite: "Yorick split-pusher — W 'Dark Procession' walls; ghouls + Maiden of the Mist push waves. (DDragon:champion:Yorick)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic + R — split-push lane pressure", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his W cage on a trapped target.", cite: "Yorick W creates a wall ring around a target. (DDragon:champion:Yorick, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Quinn: {
    id: "Quinn",
    name: "Quinn",
    positions: ["TOP", "BOTTOM"],
    intrinsicThreatTypes: ["AD-burst", "Roam"],
    coreBuild: [
      { position: "TOP", items: ["3142", "3047", "3094", "6694"], cite: "Quinn ranged TOP / lethality — R 'Behind Enemy Lines' grants high-MS scout form. (DDragon:champion:Quinn)" },
    ],
    powerSpikes: [{ items: ["3142"], label: "Lethality mythic — R map-pressure online", threatLevel: "medium" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses her E (Vault) point-and-click dash that comes with brief slow.", cite: "Quinn E dashes to and slows a target. (DDragon:champion:Quinn, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Bel'Veth": {
    id: "Belveth",
    name: "Bel'Veth",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-attackspeed", "AD-sustained"],
    coreBuild: [
      { position: "JUNGLE", items: ["3153", "3006", "3091", "3072"], cite: "Bel'Veth on-hit ADC-style jungler — passive grants attack speed scaling with all sources. (DDragon:champion:Belveth)" },
    ],
    powerSpikes: [{ items: ["3153"], label: "BotRK — full DPS pattern", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart — she's pure AS-scaling.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Briar: {
    id: "Briar",
    name: "Briar",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-sustained", "Healing", "Engage"],
    coreBuild: [
      { position: "JUNGLE", items: ["6630", "3047", "3091", "6333"], cite: "Briar frenzy bruiser — Q 'Head Rush' charges + bites; W 'Blood Frenzy' goes uncontrollable on lowest-HP enemy. (DDragon:champion:Briar)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Mythic up — frenzy dive", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts her sustain — Briar passively heals from bleed and W frenzy on-hit.", cite: "Briar passive heals from bleed damage. (DDragon:champion:Briar, DDragon:3033)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Ekko: {
    id: "Ekko",
    name: "Ekko",
    positions: ["JUNGLE", "MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Roam"],
    coreBuild: [
      { position: "JUNGLE", items: ["6657", "3020", "3157", "4645"], cite: "Ekko AP assassin — passive Z-Drive Resonance amplifies 3rd auto/ability hit; R 'Chronobreak' rewinds + heals. (DDragon:champion:Ekko)" },
    ],
    powerSpikes: [{ items: ["6657"], label: "Riftmaker — burst + rewind heal", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his W (Parallel Convergence) stun on entering the bubble.", cite: "Ekko W creates a delayed stun zone. (DDragon:champion:Ekko, DDragon:3140)" },
      { itemId: "3033", reason: "Mortal Reminder cuts his R rewind-heal.", cite: "Ekko R rewinds him to a past position and heals. (DDragon:champion:Ekko, DDragon:3033)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Elise: {
    id: "Elise",
    name: "Elise",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AP-burst", "Engage"],
    coreBuild: [
      { position: "JUNGLE", items: ["6655", "3020", "3157", "3135"], cite: "Elise spider-form swap — human Q nukes single targets, spider form rappels onto isolated victims. (DDragon:champion:Elise)" },
    ],
    powerSpikes: [{ items: ["6655"], label: "Mythic up — gank pickoff online", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3102", reason: "Banshee's Veil spell-shield blocks her E (Cocoon) stun — without the stun, her W spider-bite never connects.", cite: "Elise human-E roots with a delayed projectile. (DDragon:champion:Elise, DDragon:3102)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Cho'Gath": {
    id: "Chogath",
    name: "Cho'Gath",
    positions: ["TOP", "MIDDLE"],
    intrinsicThreatTypes: ["Tank", "CC-chain", "AP-burst"],
    coreBuild: [
      { position: "TOP", items: ["3068", "3047", "3193", "3065"], cite: "Cho'Gath HP-stacking tank — passive Feast grants permanent max HP per R kill. (DDragon:champion:Chogath)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Sunfire — frontline durability", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3036", reason: "Lord Dominik's bonus damage to higher-max-HP targets — Cho'Gath stacks max HP via R takedowns, making him the textbook target.", cite: "Cho'Gath R 'Feast' executes targets and grants permanent max HP. (DDragon:champion:Chogath, DDragon:3036)" },
      { itemId: "6653", reason: "Liandry's % current-HP burn bypasses HP stacking on the AP path.", cite: "DDragon:6653" },
      { itemId: "3140", reason: "Quicksilver Sash cleanses his Q (Rupture) knockup — denies the lockdown that lets him land R.", cite: "Cho'Gath Q is a delayed knockup AOE. (DDragon:champion:Chogath, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "Dr. Mundo": {
    id: "DrMundo",
    name: "Dr. Mundo",
    positions: ["TOP", "JUNGLE"],
    intrinsicThreatTypes: ["Healing", "Tank", "AD-sustained"],
    coreBuild: [
      { position: "TOP", items: ["6664", "3047", "3742", "3065"], cite: "Dr. Mundo HP-regen tank — R 'Maximum Dosage' heals back to full over time. (DDragon:champion:DrMundo)" },
    ],
    powerSpikes: [{ items: ["3065"], label: "Spirit Visage amps R heal", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts his R heal — antiheal is the canonical Mundo counter.", cite: "Dr. Mundo R restores 40-60% missing HP, then heals over time. (DDragon:champion:DrMundo, DDragon:3033)" },
      { itemId: "3165", reason: "Morellonomicon — same effect via AP-flavor antiheal.", cite: "DDragon:3165" },
      { itemId: "3036", reason: "Lord Dominik's vs his stacked max-HP build path.", cite: "DDragon:3036" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Gangplank: {
    id: "Gangplank",
    name: "Gangplank",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-burst", "Poke", "Roam"],
    coreBuild: [
      { position: "TOP", items: ["3508", "3006", "3071", "3072"], cite: "Gangplank crit + AD path — passive 'Trial by Fire' incendiary basic auto every few seconds; barrels Q-detonate for AOE burst. (DDragon:champion:Gangplank)" },
    ],
    powerSpikes: [{ items: ["3508", "3031"], label: "Essence Reaver + IE — barrel detonation crits", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his W (Remove Scurvy) — wait, his W self-cleanses. Use QSS for Ignite/global ult slow on the team.", cite: "DDragon:3140" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Gnar: {
    id: "Gnar",
    name: "Gnar",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-attackspeed", "Engage", "CC-chain"],
    coreBuild: [
      { position: "TOP", items: ["3078", "3047", "3071", "3053"], cite: "Gnar mixed AD bruiser — passive 'Rage Gene' transforms into mega-Gnar at 100 stacks for AOE engage. (DDragon:champion:Gnar)" },
    ],
    powerSpikes: [{ items: ["3078"], label: "Trinity Force — mini-Gnar damage online", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R (GNAR!) wall stun — denies the team-fight initiation.", cite: "Gnar R throws enemies, stunning if they hit terrain. (DDragon:champion:Gnar, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Gwen: {
    id: "Gwen",
    name: "Gwen",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AP-sustained", "Healing", "Tank"],
    coreBuild: [
      { position: "TOP", items: ["6657", "3020", "3157", "4637"], cite: "Gwen AP skirmisher — passive 'Thousand Cuts' deals % current HP true damage on autos. (DDragon:champion:Gwen)" },
    ],
    powerSpikes: [{ items: ["6657"], label: "Riftmaker — true damage + omnivamp ramp", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3076", reason: "Bramble Vest — her passive procs through autos, antiheal cuts the omnivamp she stacks.", cite: "Gwen passive heals on damage in extended fights. (DDragon:champion:Gwen, DDragon:3076)" },
      { itemId: "3110", reason: "Frozen Heart — she relies on attack speed for true damage stacking.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Illaoi: {
    id: "Illaoi",
    name: "Illaoi",
    positions: ["TOP"],
    intrinsicThreatTypes: ["Engage", "Healing", "AD-sustained"],
    coreBuild: [
      { position: "TOP", items: ["6630", "3047", "3071", "3053"], cite: "Illaoi tentacle juggernaut — R 'Leap of Faith' summons tentacles that slap nearby enemies. (DDragon:champion:Illaoi)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Sustain mythic — R team-fight zone", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts her tentacle-slap healing — Illaoi heals from Vessel souls and tentacle hits.", cite: "Illaoi E 'Test of Spirit' creates a Vessel; tentacle hits on Vessel heal her. (DDragon:champion:Illaoi, DDragon:3033)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Jax: {
    id: "Jax",
    name: "Jax",
    positions: ["TOP", "JUNGLE"],
    intrinsicThreatTypes: ["AD-sustained", "AD-attackspeed", "CC-chain"],
    coreBuild: [
      { position: "TOP", items: ["3078", "3006", "3091", "3053"], cite: "Jax hybrid duelist — passive 'Relentless Assault' stacks attack speed every 3rd auto. (DDragon:champion:Jax)" },
    ],
    powerSpikes: [{ items: ["3078"], label: "Trinity — duel pressure online", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart attack-speed slow gates his entire damage profile.", cite: "DDragon:3110" },
      { itemId: "3814", reason: "Edge of Night spell-shield blocks his E (Counter Strike) stun on the AD carry.", cite: "Jax E dodges autos, then stuns nearby enemies on second cast. (DDragon:champion:Jax, DDragon:3814)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Jayce: {
    id: "Jayce",
    name: "Jayce",
    positions: ["TOP", "MIDDLE"],
    intrinsicThreatTypes: ["AD-burst", "Poke"],
    coreBuild: [
      { position: "TOP", items: ["3142", "3047", "6694", "3071"], cite: "Jayce hammer/cannon flex — Q poke in cannon form, gap-close + burst in hammer form. (DDragon:champion:Jayce)" },
    ],
    powerSpikes: [{ items: ["3142"], label: "Lethality mythic — Q poke threat", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3814", reason: "Edge of Night spell-shield blocks his Q cannon poke — long-range main damage tool.", cite: "Jayce cannon-Q is a long-range skillshot. (DDragon:champion:Jayce, DDragon:3814)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  "K'Sante": {
    id: "KSante",
    name: "K'Sante",
    positions: ["TOP"],
    intrinsicThreatTypes: ["Tank", "Engage", "CC-chain"],
    coreBuild: [
      { position: "TOP", items: ["3068", "3047", "3193", "3742"], cite: "K'Sante tank with R-form pivot — R 'All Out' converts him into AD-skirmisher form temporarily. (DDragon:champion:KSante)" },
    ],
    powerSpikes: [{ items: ["3068"], label: "Tank mythic — R conversion damage online", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his W (Path Maker) ramming stun — denies the carry pickoff.", cite: "K'Sante W charges and impacts a target, stunning if they hit terrain. (DDragon:champion:KSante, DDragon:3140)" },
      { itemId: "3036", reason: "Lord Dominik's punishes his stacked max-HP and Path-Maker damage-reduction.", cite: "DDragon:3036" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Kayle: {
    id: "Kayle",
    name: "Kayle",
    positions: ["TOP", "MIDDLE"],
    intrinsicThreatTypes: ["AD-attackspeed", "AP-sustained"],
    coreBuild: [
      { position: "TOP", items: ["3078", "3006", "3115", "3091"], cite: "Kayle hyperscaler — passive 'Divine Ascent' grants level-gated form upgrades; ranged at 6, fully ranged + true damage at 16. (DDragon:champion:Kayle)" },
    ],
    powerSpikes: [{ items: ["3078"], label: "Trinity + level 11 — full ranged form", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3110", reason: "Frozen Heart — Kayle scales with attack speed; her core damage pattern collapses under the slow.", cite: "DDragon:3110" },
      { itemId: "3814", reason: "Edge of Night spell-shield blocks her E (Starfire Spellblade) magic damage on champion hit.", cite: "DDragon:3814" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Kennen: {
    id: "Kennen",
    name: "Kennen",
    positions: ["TOP", "MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Engage"],
    coreBuild: [
      { position: "TOP", items: ["6657", "3020", "3157", "4645"], cite: "Kennen AP team-fight bruiser — passive 'Mark of the Storm' stuns on 3 stacks; R 'Slicing Maelstrom' applies stacks rapidly. (DDragon:champion:Kennen)" },
    ],
    powerSpikes: [{ items: ["6657"], label: "Riftmaker — R team-fight stun chain", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his R-stack stuns mid-team-fight.", cite: "DDragon:3140" },
      { itemId: "3814", reason: "Edge of Night for AD carries against his ult engage.", cite: "DDragon:3814" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Kled: {
    id: "Kled",
    name: "Kled",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-burst", "Engage"],
    coreBuild: [
      { position: "TOP", items: ["3142", "3047", "3071", "3053"], cite: "Kled dismount-mounted swap — passive 'Skaarl the Cowardly Lizard' swaps between mount/dismount with HP threshold. (DDragon:champion:Kled)" },
    ],
    powerSpikes: [{ items: ["3142"], label: "Lethality mythic — gank dive online", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3140", reason: "Quicksilver Sash cleanses his Q (Beartrap on a Rope) yank.", cite: "Kled Q hooks an enemy and pulls them. (DDragon:champion:Kled, DDragon:3140)" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Nasus: {
    id: "Nasus",
    name: "Nasus",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-sustained", "Healing", "Tank"],
    coreBuild: [
      { position: "TOP", items: ["3742", "3047", "3071", "3065"], cite: "Nasus Q-stacker — Q 'Siphoning Strike' permanently stacks AD on minion/champion takedowns. (DDragon:champion:Nasus)" },
    ],
    powerSpikes: [{ items: ["3742"], label: "Dead Man's — full Q-stack damage at 25 min+", threatLevel: "critical" }],
    counteredBy: [
      { itemId: "3076", reason: "Bramble Vest cuts his W lifesteal heal AND triggers Grievous Wounds whenever he autos with Q.", cite: "Nasus passive grants lifesteal scaling with level. (DDragon:champion:Nasus, DDragon:3076)" },
      { itemId: "3110", reason: "Frozen Heart attack-speed slow delays his Q stacking pace.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Olaf: {
    id: "Olaf",
    name: "Olaf",
    positions: ["TOP", "JUNGLE"],
    intrinsicThreatTypes: ["AD-sustained", "Healing", "Engage"],
    coreBuild: [
      { position: "TOP", items: ["6630", "3047", "3091", "3053"], cite: "Olaf rage juggernaut — passive 'Berserker Rage' grants attack speed scaling with missing HP. (DDragon:champion:Olaf)" },
    ],
    powerSpikes: [{ items: ["6630"], label: "Sustain mythic — R CC-immunity dive", threatLevel: "high" }],
    counteredBy: [
      { itemId: "3033", reason: "Mortal Reminder cuts his W (Tough It Out) lifesteal — Olaf relies on lifesteal in extended trades.", cite: "Olaf W grants attack speed and lifesteal. (DDragon:champion:Olaf, DDragon:3033)" },
      { itemId: "3110", reason: "Frozen Heart neuters his AS-scaling DPS.", cite: "DDragon:3110" },
    ],
    patchPinned: PATCH_PINNED,
  },
  Cassiopeia: {
    id: "Cassiopeia",
    name: "Cassiopeia",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-DoT", "AP-sustained", "CC-chain"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "6653", // Liandry's — DoT signature mage
          "3020",
          "3135",
          "3157",
        ],
        cite: "Cassiopeia DoT mage — E 'Twin Fang' is a low-cooldown spammable on poisoned targets; passive 'Serpentine Grace' grants MS instead of boots. (DDragon:champion:Cassiopeia)",
      },
    ],
    powerSpikes: [
      {
        items: ["6653"],
        label: "Liandry's — DoT scaling online",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "4401",
        reason:
          "Force of Nature scales MR with magic damage taken — Cassiopeia's persistent E spam feeds the absorb stacks faster than any other AP champion.",
        cite: "Cassiopeia E spams on poisoned targets, dealing repeated magic damage. (DDragon:champion:Cassiopeia, DDragon:4401)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses her R (Petrifying Gaze) facing-stun — denies the team-fight initiation.",
        cite: "Cassiopeia R stuns enemies facing her or slows the rest. (DDragon:champion:Cassiopeia, DDragon:3140)",
      },
      {
        itemId: "3065",
        reason:
          "Spirit Visage boosts your incoming heals — pair with any sustain to outlast her DoT pressure.",
        cite: "DDragon:3065",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Yone: {
    id: "Yone",
    name: "Yone",
    positions: ["MIDDLE", "TOP"],
    intrinsicThreatTypes: ["AD-sustained", "AD-burst", "Engage"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "6673", // Immortal Shieldbow — common Yone mythic
          "3006",
          "3031", // IE
          "3072", // Bloodthirster
        ],
        cite: "Yone crit fighter — passive 'Way of the Hunter' grants 50% crit-chance doubling like Yasuo. (DDragon:champion:Yone)",
      },
    ],
    powerSpikes: [
      {
        items: ["6673", "3031"],
        label: "Mythic + IE — full Q3-R combo lethal",
        threatLevel: "critical",
      },
    ],
    counteredBy: [
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks his R (Fate Sealed) — the dash-knockup that initiates his entire kill combo.",
        cite: "Yone R dashes through enemies and knocks them up. Spell-shield consumes the dash. (DDragon:champion:Yone, DDragon:3814)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his Q3 knockup if landed — break the combo before R adds the second knockup.",
        cite: "DDragon:3140",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Irelia: {
    id: "Irelia",
    name: "Irelia",
    positions: ["TOP", "MIDDLE"],
    intrinsicThreatTypes: ["AD-burst", "AD-sustained", "CC-chain"],
    coreBuild: [
      {
        position: "TOP",
        items: [
          "3078", // Trinity Force
          "3047",
          "3071",
          "3053",
        ],
        cite: "Irelia bruiser path — Q resets on champion takedown + Trinity Sheen procs scale her dive pressure. (DDragon:champion:Irelia)",
      },
    ],
    powerSpikes: [
      {
        items: ["3078"],
        label: "Trinity — Q-reset combo damage online",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks her R (Vanguard's Edge) wall — the only AOE CC in her kit.",
        cite: "Irelia R fires blades that form a wall, stunning enemies who cross. (DDragon:champion:Irelia, DDragon:3814)",
      },
      {
        itemId: "3076",
        reason:
          "Bramble Vest cuts her W (Defiant Dance) heal on auto-attack damage taken.",
        cite: "Irelia W reduces incoming damage and second cast deals damage. (DDragon:champion:Irelia, DDragon:3076)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Akali: {
    id: "Akali",
    name: "Akali",
    positions: ["MIDDLE", "TOP"],
    intrinsicThreatTypes: ["AP-burst", "Roam"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "6655",
          "3020",
          "3157", // Zhonya's
          "3089",
        ],
        cite: "Akali assassin AP — W 'Twilight Shroud' stealth + R 'Perfect Execution' double-dash for pickoffs. (DDragon:champion:Akali)",
      },
    ],
    powerSpikes: [
      {
        items: ["6655"],
        label: "Mythic up — full E-R combo lethal on squishies",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield blocks her E (Shuriken Flip) — without the slow + mark, her R execution loses target lock.",
        cite: "Akali E throws and recalls a shuriken; if it hits, R2 executes target. (DDragon:champion:Akali, DDragon:3102)",
      },
      {
        itemId: "3157",
        reason:
          "Zhonya's Hourglass stasis through her R2 execution — survive the burst window, recover.",
        cite: "Akali R2 deals execute damage based on missing HP. (DDragon:champion:Akali, DDragon:3157)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  LeBlanc: {
    id: "Leblanc",
    name: "LeBlanc",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "Roam"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "6655",
          "3020",
          "3157",
          "3135",
        ],
        cite: "LeBlanc assassin mage — W 'Distortion' second-cast returns to origin, enabling skirmish disengage. (DDragon:champion:Leblanc)",
      },
    ],
    powerSpikes: [
      {
        items: ["6655"],
        label: "Mythic up — Q-W-E one-shot combo",
        threatLevel: "critical",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield blocks her Q (Sigil of Malice) — her entire kill combo opens with Q to apply the mark.",
        cite: "LeBlanc Q applies a mark; following damaging ability detonates the mark for bonus magic damage. (DDragon:champion:Leblanc, DDragon:3102)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses her E (Ethereal Chains) root — denies the lockdown that follows the mark.",
        cite: "LeBlanc E roots target after delay. (DDragon:champion:Leblanc, DDragon:3140)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Lucian: {
    id: "Lucian",
    name: "Lucian",
    positions: ["BOTTOM", "MIDDLE"],
    intrinsicThreatTypes: ["AD-sustained", "AD-attackspeed", "Roam"],
    coreBuild: [
      {
        position: "BOTTOM",
        items: [
          "3508", // Essence Reaver — synergy with Lucian's passive double-shot
          "3006",
          "3031", // IE
          "3094", // RFC
        ],
        cite: "Lucian crit ADC — passive 'Lightslinger' next basic-attack-after-ability fires twice. (DDragon:champion:Lucian)",
      },
    ],
    powerSpikes: [
      {
        items: ["3508", "3031"],
        label: "Essence Reaver + IE — passive double-shot scaling",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3110",
        reason:
          "Frozen Heart attack-speed slow — Lucian's passive depends on auto-attack rhythm; AS slow disrupts the proc cadence.",
        cite: "DDragon:3110",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his R (The Culling) channel slow — escape the bullet zone.",
        cite: "Lucian R 'The Culling' channels rapid-fire bullets in a direction. (DDragon:champion:Lucian, DDragon:3140)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Jhin: {
    id: "Jhin",
    name: "Jhin",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-burst", "Poke"],
    coreBuild: [
      {
        position: "BOTTOM",
        items: [
          "3142", // Youmuu's — lethality path is canonical Jhin
          "3047",
          "3094",
          "6694",
        ],
        cite: "Jhin lethality ADC — passive 'Whisper' fires 4 shots with the 4th being crit-amplified. (DDragon:champion:Jhin)",
      },
    ],
    powerSpikes: [
      {
        items: ["3142"],
        label: "Lethality mythic — every 4th-shot lethal on squishies",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks his W (Deadly Flourish) root on champion-marked targets — the lockdown that sets up his R.",
        cite: "Jhin W roots a champion if they were recently affected by ally CC. (DDragon:champion:Jhin, DDragon:3814)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his W root — escape the R execution lineup.",
        cite: "DDragon:3140",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Ashe: {
    id: "Ashe",
    name: "Ashe",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-attackspeed", "AD-sustained", "Engage"],
    coreBuild: [
      {
        position: "BOTTOM",
        items: [
          "6672", // Kraken
          "3006",
          "3094",
          "3031",
        ],
        cite: "Ashe utility ADC — passive 'Frost Shot' applies a slow on every auto; R 'Enchanted Crystal Arrow' is a global stun-tool. (DDragon:champion:Ashe)",
      },
    ],
    powerSpikes: [
      {
        items: ["6672"],
        label: "Kraken — sustained AS DPS online",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses her R (Enchanted Crystal Arrow) stun — the kill-pickup hard CC.",
        cite: "Ashe R stuns single target on hit, stun duration scales with travel distance. (DDragon:champion:Ashe, DDragon:3140)",
      },
      {
        itemId: "3110",
        reason:
          "Frozen Heart attack-speed slow neuters her sustained DPS pattern.",
        cite: "DDragon:3110",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Morgana: {
    id: "Morgana",
    name: "Morgana",
    positions: ["UTILITY", "MIDDLE"],
    intrinsicThreatTypes: ["CC-chain", "AP-DoT", "Shielding"],
    coreBuild: [
      {
        position: "UTILITY",
        items: [
          "3158", // Ionian Boots
          "3107", // Redemption
          "3222", // Mikael's
          "3190",
        ],
        cite: "Morgana utility support — long single-target Q bind + R suspends multiple targets. E shields ally from magic damage AND CC. (DDragon:champion:Morgana)",
      },
    ],
    powerSpikes: [
      {
        items: ["3107"],
        label: "Redemption + boots — full team-fight kit online",
        threatLevel: "medium",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses her Q (Dark Binding) root — the lockdown that her entire engage is built around.",
        cite: "Morgana Q is a long-range single-target root. (DDragon:champion:Morgana, DDragon:3140)",
      },
      {
        itemId: "6695",
        reason:
          "Serpent's Fang shreds her E (Black Shield) — the only ability in League that grants spell shield via a teammate; bypassing it is high-leverage.",
        cite: "Morgana E grants spell-shield + magic-damage shield to ally. (DDragon:champion:Morgana, DDragon:6695)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Sett: {
    id: "Sett",
    name: "Sett",
    positions: ["TOP", "UTILITY"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "CC-chain"],
    coreBuild: [
      {
        position: "TOP",
        items: [
          "6630",
          "3047",
          "3053", // Sterak's
          "3071",
        ],
        cite: "Sett juggernaut path — passive 'Pit Grit' alternates auto bonus for sustained trades. (DDragon:champion:Sett)",
      },
    ],
    powerSpikes: [
      {
        items: ["6630"],
        label: "Mythic up — engage threat",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his R (The Show Stopper) suspension — the long-cast carry-grab.",
        cite: "Sett R grabs an enemy and slams them down, knocking up. (DDragon:champion:Sett, DDragon:3140)",
      },
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks his W (Haymaker) burst on grit-stacked targets.",
        cite: "Sett W deals % missing-HP true damage based on accumulated grit. (DDragon:champion:Sett, DDragon:3814)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Riven: {
    id: "Riven",
    name: "Riven",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-burst", "Engage"],
    coreBuild: [
      {
        position: "TOP",
        items: [
          "6692", // Eclipse — burst lethality for skirmishers
          "3047",
          "3142", // Youmuu's
          "6694", // Serylda's
        ],
        cite: "Riven lethality skirmisher — Eclipse + lethality stack with her Q triple-cast burst. (DDragon:champion:Riven)",
      },
    ],
    powerSpikes: [
      {
        items: ["6692"],
        label: "Mythic up — full Q-W-E-R combo lethal",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks her W (Ki Burst) stun — the only hard CC in her kit.",
        cite: "Riven W is a small-AOE stun. (DDragon:champion:Riven, DDragon:3814)",
      },
      {
        itemId: "3026",
        reason:
          "Guardian Angel revives a squishy through her R (Wind Slash) execute window.",
        cite: "Riven R 'Wind Slash' deals damage based on missing HP. (DDragon:champion:Riven, DDragon:3026)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Hecarim: {
    id: "Hecarim",
    name: "Hecarim",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["Engage", "AD-sustained", "CC-chain"],
    coreBuild: [
      {
        position: "JUNGLE",
        items: [
          "6630",
          "3009", // Boots of Swiftness — MS scaling for him
          "3071",
          "3053",
        ],
        cite: "Hecarim engage bruiser — passive 'Warpath' converts MS to AD, so MS items compound his damage. (DDragon:champion:Hecarim)",
      },
    ],
    powerSpikes: [
      {
        items: ["6630", "3009"],
        label: "Sustain mythic + Swifties — gank speed online",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his R (Onslaught of Shadows) fear — the only hard CC that follows his engage.",
        cite: "Hecarim R fears nearby enemies after dashing in. (DDragon:champion:Hecarim, DDragon:3140)",
      },
      {
        itemId: "3076",
        reason:
          "Bramble Vest applies Grievous Wounds to his auto attacks; he scales heavily with E (Devastating Charge) ramped damage on autos.",
        cite: "Hecarim E ramps movement speed and amplifies next basic attack. (DDragon:champion:Hecarim, DDragon:3076)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Annie: {
    id: "Annie",
    name: "Annie",
    positions: ["MIDDLE", "UTILITY"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "6655",
          "3020",
          "3157", // Zhonya's
          "3089", // Rabadon's
        ],
        cite: "Annie AP burst — passive 'Pyromania' stacks every 4 spells; next cast stuns. R 'Tibbers' summons a tanky AOE companion. (DDragon:champion:Annie)",
      },
    ],
    powerSpikes: [
      {
        items: ["6655"],
        label: "Mythic up — full E-R-Q delete combo",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield consumes her stunning ability — Annie's stuns are point-and-click on her stack-charged spell, which is THE setup for her R.",
        cite: "Annie passive stuns the next damaging ability after 4 stacks. (DDragon:champion:Annie, DDragon:3102)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses the stun if it lands — escape the followup R combo.",
        cite: "DDragon:3140",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Kassadin: {
    id: "Kassadin",
    name: "Kassadin",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "Roam"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "6653", // Liandry's — anti-tank for late team fights
          "3020",
          "3089",
          "3157",
        ],
        cite: "Kassadin late-game AP scaler — R 'Riftwalk' is a short-blink that scales infinitely. Becomes near-unkillable post-16. (DDragon:champion:Kassadin)",
      },
    ],
    powerSpikes: [
      {
        items: ["6653", "3089"],
        label: "Two items + level 16 — uncatchable mode",
        threatLevel: "critical",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his Q (Null Sphere) silence — without the silence, casters can fight back during his blinks.",
        cite: "Kassadin Q silences for 1.5s and grants a magic-damage shield. (DDragon:champion:Kassadin, DDragon:3140)",
      },
      {
        itemId: "3026",
        reason:
          "Guardian Angel for the carries he ult-blinks onto — denies the kill confirm in his late-game pickoff window.",
        cite: "DDragon:3026",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Karthus: {
    id: "Karthus",
    name: "Karthus",
    positions: ["JUNGLE", "MIDDLE"],
    intrinsicThreatTypes: ["AP-DoT", "AP-burst", "Poke"],
    coreBuild: [
      {
        position: "JUNGLE",
        items: [
          "6655",
          "3020",
          "3135",
          "3089",
        ],
        cite: "Karthus AP burst with global R execute. Passive 'Death Defied' lets him cast for 7s after dying. (DDragon:champion:Karthus)",
      },
    ],
    powerSpikes: [
      {
        items: ["6655", "3089"],
        label: "Mythic + Rabadon's — global R execute threshold",
        threatLevel: "critical",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield blocks his R (Requiem) — every R dodge is a teamfight he doesn't get free damage on.",
        cite: "Karthus R deals magic damage to all enemy champions globally. (DDragon:champion:Karthus, DDragon:3102)",
      },
      {
        itemId: "4401",
        reason:
          "Force of Nature for his Q-spam DoT path — sustained AP feeds the absorb stacks.",
        cite: "DDragon:4401",
      },
      {
        itemId: "3157",
        reason:
          "Zhonya's Hourglass stasis through R timing denies the global execute.",
        cite: "DDragon:3157",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  "Miss Fortune": {
    id: "MissFortune",
    name: "Miss Fortune",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-sustained", "Poke"],
    coreBuild: [
      {
        position: "BOTTOM",
        items: [
          "6671", // Galeforce
          "3006",
          "3094", // RFC
          "3031", // IE
        ],
        cite: "Miss Fortune ADC — long-range Q poke + R 'Bullet Time' team-fight ult. (DDragon:champion:MissFortune)",
      },
    ],
    powerSpikes: [
      {
        items: ["6671"],
        label: "Galeforce — kite + R repositioning",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses her R channel slow on the team — once the slow is cleansed, the team escapes the bullet zone.",
        cite: "Miss Fortune R 'Bullet Time' applies a slow + AOE damage in a cone. (DDragon:champion:MissFortune, DDragon:3140)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Tristana: {
    id: "Tristana",
    name: "Tristana",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-sustained", "AD-attackspeed"],
    coreBuild: [
      {
        position: "BOTTOM",
        items: [
          "6672", // Kraken
          "3006",
          "3094",
          "3031",
        ],
        cite: "Tristana hyperscaling crit ADC — passive 'Draw a Bead' grants attack range per level. (DDragon:champion:Tristana)",
      },
    ],
    powerSpikes: [
      {
        items: ["6672", "3094"],
        label: "Kraken + RFC — siege-range threat",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3110",
        reason:
          "Frozen Heart attack-speed slow neuters her sustained DPS — Tristana relies entirely on auto-attack stacking.",
        cite: "DDragon:3110",
      },
      {
        itemId: "3026",
        reason:
          "Guardian Angel for the carries she R-knockbacks — denies the pick-off in late-game team fights.",
        cite: "Tristana R 'Buster Shot' knocks back a target with damage. (DDragon:champion:Tristana, DDragon:3026)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Karma: {
    id: "Karma",
    name: "Karma",
    positions: ["UTILITY", "MIDDLE"],
    intrinsicThreatTypes: ["Shielding", "Poke", "AP-burst"],
    coreBuild: [
      {
        position: "UTILITY",
        items: [
          "3504", // Ardent
          "3158",
          "3107",
          "3222",
        ],
        cite: "Karma enchanter — R 'Mantra' empowers next ability; mantra'd E shields and grants MS. (DDragon:champion:Karma)",
      },
    ],
    powerSpikes: [
      {
        items: ["3504"],
        label: "Ardent up — carry hyperscaling",
        threatLevel: "medium",
      },
    ],
    counteredBy: [
      {
        itemId: "6695",
        reason:
          "Serpent's Fang shreds her mantra-E shield — her single most-impactful ability for the carry she protects.",
        cite: "Karma E 'Inspire' shields target ally; mantra'd version pulses MS to nearby allies. (DDragon:champion:Karma, DDragon:6695)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Pyke: {
    id: "Pyke",
    name: "Pyke",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["AD-burst", "Roam", "Engage"],
    coreBuild: [
      {
        position: "UTILITY",
        items: [
          "6691", // Duskblade
          "3158",
          "3142", // Youmuu's
          "6695", // Serpent's Fang — anti-shield for execute target
        ],
        cite: "Pyke roaming-execute support — R 'Death from Below' resets on takedown and shares full kill gold with assist. (DDragon:champion:Pyke)",
      },
    ],
    powerSpikes: [
      {
        items: ["6691"],
        label: "Mythic up — Q hook + R execute combo",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield blocks his Q (Bone Skewer) hook-charge OR E (Phantom Undertow) stun — both are skill-shots that consume the shield.",
        cite: "Pyke Q is a chargeable hook; E is a delayed dash-stun. (DDragon:champion:Pyke, DDragon:3102)",
      },
      {
        itemId: "3026",
        reason:
          "Guardian Angel for the carry he targets — his R only executes below an HP threshold; GA revive resets the threshold check.",
        cite: "Pyke R executes targets below an HP threshold scaling with bonus AD. (DDragon:champion:Pyke, DDragon:3026)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Fiora: {
    id: "Fiora",
    name: "Fiora",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-burst", "AD-sustained", "Healing"],
    coreBuild: [
      {
        position: "TOP",
        items: [
          "3078", // Trinity Force
          "3047",
          "3071", // Black Cleaver
          "3072", // Bloodthirster
        ],
        cite: "Fiora skirmisher path — Trinity Force Sheen proc on Q + W parry create extended trade pressure. (DDragon:champion:Fiora)",
      },
    ],
    powerSpikes: [
      {
        items: ["3078"],
        label: "Trinity Force — Sheen-proc damage online",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3076",
        reason:
          "Bramble Vest cuts her R (Grand Challenge) heal — vital-stacking R completion gives massive heal; antiheal slashes it.",
        cite: "Fiora R completes when 4 Vitals are struck, healing her and nearby allies. (DDragon:champion:Fiora, DDragon:3076)",
      },
      {
        itemId: "3033",
        reason:
          "Mortal Reminder for AD carries — same antiheal effect on her R heal explosion.",
        cite: "DDragon:3033",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Mordekaiser: {
    id: "Mordekaiser",
    name: "Mordekaiser",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AP-sustained", "Tank", "Engage"],
    coreBuild: [
      {
        position: "TOP",
        items: [
          "6655", // Luden's or Liandry's path — using Luden's for AP juggernaut burst
          "3047",
          "4637", // Demonic Embrace — %max-HP burn synergy
          "3157", // Zhonya's
        ],
        cite: "Mordekaiser AP juggernaut — passive 'Darkness Rise' AoE magic damage in extended fights. (DDragon:champion:Mordekaiser)",
      },
    ],
    powerSpikes: [
      {
        items: ["6655", "4637"],
        label: "Mythic + Demonic Embrace — sustained AP threat",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his R (Realm of Death) — escapes the 1v1 dimension before he stats-steals you.",
        cite: "Mordekaiser R drags target to a separate realm and steals stats over the duration. QSS cleanses the realm. (DDragon:champion:Mordekaiser, DDragon:3140)",
      },
      {
        itemId: "4401",
        reason:
          "Force of Nature scales MR with magic damage taken — his sustained AOE feeds it constantly.",
        cite: "DDragon:4401",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Vi: {
    id: "Vi",
    name: "Vi",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "CC-chain"],
    coreBuild: [
      {
        position: "JUNGLE",
        items: [
          "6630",
          "3047",
          "3071", // Black Cleaver
          "3053", // Sterak's
        ],
        cite: "Vi bruiser jungle — single-target engage with point-and-click R lockdown. (DDragon:champion:Vi)",
      },
    ],
    powerSpikes: [
      {
        items: ["6630", "3071"],
        label: "Mythic + Cleaver — gank lockdown enabled",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses her R (Cease and Desist) suppression — denies the kill confirm on the carry she dives.",
        cite: "Vi R is a point-and-click suppression dash. QSS cleanses suppression. (DDragon:champion:Vi, DDragon:3140)",
      },
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks her R outright on the AD carry she targets.",
        cite: "DDragon:3814",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Warwick: {
    id: "Warwick",
    name: "Warwick",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["Healing", "AD-sustained", "Engage"],
    coreBuild: [
      {
        position: "JUNGLE",
        items: [
          "6630",
          "3047",
          "6333", // Death's Dance
          "3053",
        ],
        cite: "Warwick sustain bruiser — passive 'Eternal Hunger' heals on auto-attack damage; layered sustain mythic + DD. (DDragon:champion:Warwick)",
      },
    ],
    powerSpikes: [
      {
        items: ["6630"],
        label: "Sustain mythic — duel and gank durability core",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3076",
        reason:
          "Bramble Vest applies Grievous Wounds when he basic-attacks you — passive 'Eternal Hunger' heals every auto, so antiheal drains the mechanic at the source.",
        cite: "Warwick passive heals based on damage dealt, scaling with missing HP. (DDragon:champion:Warwick, DDragon:3076)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his R (Infinite Duress) suppression — the only hard-CC that stops his ult dive.",
        cite: "Warwick R suppresses target. QSS cleanses suppression. (DDragon:champion:Warwick, DDragon:3140)",
      },
      {
        itemId: "3033",
        reason:
          "Mortal Reminder cuts his lifesteal + W heal — antiheal is the canonical Warwick counter for AD carries.",
        cite: "DDragon:3033",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Syndra: {
    id: "Syndra",
    name: "Syndra",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Poke"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "6655",
          "3020",
          "3135",
          "3089",
        ],
        cite: "Syndra control-mage burst path — R 'Unleashed Power' single-target nuke scales with sphere stacks. (DDragon:champion:Syndra)",
      },
    ],
    powerSpikes: [
      {
        items: ["6655", "3089"],
        label: "Luden's + Rabadon's — R execute one-shot",
        threatLevel: "critical",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield blocks her E (Scatter the Weak) — without the stun, her R can't connect on a stationary squishy.",
        cite: "Syndra E knocks back spheres or champions, stunning hit champions briefly. (DDragon:champion:Syndra, DDragon:3102)",
      },
      {
        itemId: "3157",
        reason:
          "Zhonya's Hourglass stasis interrupts the R combo — survive the burst, recover.",
        cite: "DDragon:3157",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Ezreal: {
    id: "Ezreal",
    name: "Ezreal",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-sustained", "Poke", "Roam"],
    coreBuild: [
      {
        position: "BOTTOM",
        items: [
          "6630", // Iceborn / Trinity / Manamune chain — using bruiser path here for safety
          "3142", // Youmuu's
          "3094", // RFC
          "3036", // Lord Dominik's
        ],
        cite: "Ezreal long-range Q-poke ADC. Variable path (bruiser vs lethality vs Manamune); Manamune is canonical late-game. (DDragon:champion:Ezreal)",
      },
    ],
    powerSpikes: [
      {
        items: ["6630"],
        label: "Mythic + first-item — Q poke threat",
        threatLevel: "medium",
      },
    ],
    counteredBy: [
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks his Q (Mystic Shot) — his entire poke pattern AND R wave-clear opener.",
        cite: "Ezreal Q is a long-range skillshot that triggers his AS passive on hit. (DDragon:champion:Ezreal, DDragon:3814)",
      },
      {
        itemId: "3110",
        reason:
          "Frozen Heart — when Ezreal goes Manamune-AD path, his sustained DPS scales with attack speed; AS slow neuters it.",
        cite: "DDragon:3110",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  "Kai'Sa": {
    id: "Kaisa",
    name: "Kai'Sa",
    positions: ["BOTTOM"],
    intrinsicThreatTypes: ["AD-sustained", "AD-attackspeed", "Roam"],
    coreBuild: [
      {
        position: "BOTTOM",
        items: [
          "6672", // Kraken Slayer
          "3006",
          "3094", // RFC — extra range scales her on-hit damage from Kraken
          "3031", // IE
        ],
        cite: "Kai'Sa hybrid-scaling ADC. Q evolves with AD breakpoints; passive 'Second Skin' on-hit magic damage. (DDragon:champion:Kaisa)",
      },
    ],
    powerSpikes: [
      {
        items: ["6672", "3094"],
        label: "Kraken + RFC — Q evolve threshold reached",
        threatLevel: "critical",
      },
    ],
    counteredBy: [
      {
        itemId: "3110",
        reason:
          "Frozen Heart attack-speed slow — Kai'Sa's passive on-hit and Q evolve scale with auto rate.",
        cite: "DDragon:3110",
      },
      {
        itemId: "3026",
        reason:
          "Guardian Angel revives the carry she ults onto — her R (Killer Instinct) is a long-range dash to plasma-stacked targets.",
        cite: "Kai'Sa R dashes to a target afflicted with passive plasma. (DDragon:champion:Kaisa, DDragon:3026)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Soraka: {
    id: "Soraka",
    name: "Soraka",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Healing", "Shielding"],
    coreBuild: [
      {
        position: "UTILITY",
        items: [
          "3107", // Redemption — heal active
          "3158", // Ionian Boots
          "3504", // Ardent Censer
          "3222", // Mikael's Blessing
        ],
        cite: "Soraka pure-healer path — W 'Astral Infusion' is a per-cast heal that sacrifices her own HP, scaling with AP and ability haste. (DDragon:champion:Soraka)",
      },
    ],
    powerSpikes: [
      {
        items: ["3107"],
        label: "Redemption — team-fight heal active online",
        threatLevel: "medium",
      },
    ],
    counteredBy: [
      {
        itemId: "3033",
        reason:
          "Mortal Reminder applied to her ally cuts her W heal — she's the highest-output single-target healer in the game; antiheal is non-negotiable vs Soraka comps.",
        cite: "Soraka W heals an ally for a flat amount + AP scaling. (DDragon:champion:Soraka, DDragon:3033)",
      },
      {
        itemId: "3165",
        reason:
          "Morellonomicon — same effect via AP-flavor antiheal for mages on the team.",
        cite: "DDragon:3165",
      },
      {
        itemId: "3076",
        reason:
          "Bramble Vest for an armor frontline — her allies tank for her, and antiheal stacking matters across multiple sources.",
        cite: "DDragon:3076",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Garen: {
    id: "Garen",
    name: "Garen",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-sustained", "Tank"],
    coreBuild: [
      {
        position: "TOP",
        items: [
          "6630",
          "3047",
          "3071", // Black Cleaver
          "3053", // Sterak's Gage
        ],
        cite: "Garen juggernaut path — bruiser sustain mythic + armor shred. (DDragon:champion:Garen)",
      },
    ],
    powerSpikes: [
      {
        items: ["6630", "3071"],
        label: "Mythic + Black Cleaver — frontline + shred",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3076",
        reason:
          "Bramble Vest applies Grievous Wounds when he basic-attacks you, gating his passive HP regen which is core to his sustained pressure.",
        cite: "Garen passive 'Perseverance' regenerates HP out of recent damage. (DDragon:champion:Garen, DDragon:3076)",
      },
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks his Q (Decisive Strike) silence — without the silence, ranged casters can kite him.",
        cite: "Garen Q applies a brief silence on hit. (DDragon:champion:Garen, DDragon:3814)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Camille: {
    id: "Camille",
    name: "Camille",
    positions: ["TOP"],
    intrinsicThreatTypes: ["AD-burst", "Engage", "AD-sustained"],
    coreBuild: [
      {
        position: "TOP",
        items: [
          "3078", // Trinity Force — her core mythic-tier item with sheen proc
          "3047",
          "3071",
          "3053",
        ],
        cite: "Camille divers / split path — Trinity Force is THE Camille item; Sheen proc on her Q reset is core to her damage. (DDragon:champion:Camille)",
      },
    ],
    powerSpikes: [
      {
        items: ["3078"],
        label: "Trinity Force — Sheen-proc Q damage spikes",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses her R (Hextech Ultimatum) hex-zone — the lockdown that lets her burst a target with Q true damage.",
        cite: "Camille R traps an enemy in a zone they can't leave. (DDragon:champion:Camille, DDragon:3140)",
      },
      {
        itemId: "3076",
        reason:
          "Bramble Vest cuts her W (Tactical Sweep) sustain — the HP regen on hit on low-HP champions.",
        cite: "Camille W second hit on low-HP target heals her. (DDragon:champion:Camille, DDragon:3076)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  "Master Yi": {
    id: "MasterYi",
    name: "Master Yi",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-attackspeed", "AD-sustained", "Healing"],
    coreBuild: [
      {
        position: "JUNGLE",
        items: [
          "3153", // BotRK
          "3006",
          "3046", // PD
          "3072", // Bloodthirster
          "3026", // GA
        ],
        cite: "Master Yi attack-speed-stacker. BotRK + PD scale his auto-attacks; GA for late-game team fights. (DDragon:champion:MasterYi)",
      },
    ],
    powerSpikes: [
      {
        items: ["3153", "3046"],
        label: "BotRK + PD — full DPS pattern online",
        threatLevel: "critical",
      },
    ],
    counteredBy: [
      {
        itemId: "3110",
        reason:
          "Frozen Heart aura attack-speed slow is the textbook Yi counter — he is purely AS-reliant.",
        cite: "Master Yi E 'Wuju Style' bonus damage on autos; AS slow neuters his DPS pattern. (DDragon:champion:MasterYi, DDragon:3110)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses CC his ult ignores — when he ults onto your carry, QSS the CC chain that should peel him.",
        cite: "Master Yi R 'Highlander' grants CC immunity for the duration. QSS is for the carry, not Yi himself. (DDragon:3140)",
      },
      {
        itemId: "3033",
        reason:
          "Mortal Reminder cuts his lifesteal-fueled sustain — Yi commonly builds Bloodthirster + omnivamp.",
        cite: "DDragon:3033",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  "Kha'Zix": {
    id: "Khazix",
    name: "Kha'Zix",
    positions: ["JUNGLE"],
    intrinsicThreatTypes: ["AD-burst", "Roam"],
    coreBuild: [
      {
        position: "JUNGLE",
        items: [
          "6691", // Duskblade — first-attack-from-stealth bonus
          "3142",
          "3047",
          "6694", // Serylda's
        ],
        cite: "Kha'Zix lethality assassin path — Duskblade synergizes with R stealth + isolation Q evolve. (DDragon:champion:Khazix)",
      },
    ],
    powerSpikes: [
      {
        items: ["6691"],
        label: "Mythic up — pickoff + isolation Q core",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3026",
        reason:
          "Guardian Angel revives the squishy he isolates — denies the kill confirm even if his combo lands.",
        cite: "Kha'Zix Q evolved deals bonus damage to isolated targets — he's built around picking off lone champions. GA negates the burst. (DDragon:champion:Khazix, DDragon:3026)",
      },
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks his Q burst.",
        cite: "DDragon:3814",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Diana: {
    id: "Diana",
    name: "Diana",
    positions: ["JUNGLE", "MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "Engage"],
    coreBuild: [
      {
        position: "JUNGLE",
        items: [
          "6655", // Luden's
          "3020",
          "3157", // Zhonya's
          "3089", // Rabadon's
        ],
        cite: "Diana AP burst path — R 'Moonfall' grouped target hit + Q-W-R-Q pull combo deletes squishies. (DDragon:champion:Diana)",
      },
    ],
    powerSpikes: [
      {
        items: ["6655"],
        label: "Mythic up — full burst combo lethal on squishies",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield blocks her Q (Crescent Strike) — without the moonlight debuff, her R can't pull her to a target for the burst combo.",
        cite: "Diana Q applies Moonlight; R only resets/pulls to Moonlit targets. Spell-shield consumes the Q. (DDragon:champion:Diana, DDragon:3102)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses her R pull — even if the combo connects, the dive is escapable.",
        cite: "DDragon:3140",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Veigar: {
    id: "Veigar",
    name: "Veigar",
    positions: ["MIDDLE"],
    intrinsicThreatTypes: ["AP-burst", "CC-chain", "Poke"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "6655", // Luden's Companion
          "3020",
          "3089", // Rabadon's — scales harder on Veigar than most due to infinite AP stacking
          "3135", // Void Staff
        ],
        cite: "Veigar AP burst path — passive 'Phenomenal Evil Power' grants permanent AP per ability hit on champions, making Rabadon's the highest-leverage mage item. (DDragon:champion:Veigar)",
      },
    ],
    powerSpikes: [
      {
        items: ["6655", "3089"],
        label: "Mythic + Rabadon's — R execute one-shot threshold",
        threatLevel: "critical",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield consumes his E (Event Horizon) cage edge — without the cage stun, his R can't target a stationary squishy.",
        cite: "Veigar E 'Event Horizon' is a ring of stun on the edge. R 'Primordial Burst' is a single-target nuke. Spell-shield blocks the cage stun. (DDragon:champion:Veigar, DDragon:3102)",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses the cage stun if it lands — escape before the R nuke connects.",
        cite: "DDragon:3140",
      },
      {
        itemId: "3157",
        reason:
          "Zhonya's Hourglass stasis interrupts his R execution — if you survive the initial burst, stasis denies the kill.",
        cite: "DDragon:3157",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Brand: {
    id: "Brand",
    name: "Brand",
    positions: ["MIDDLE", "UTILITY"],
    intrinsicThreatTypes: ["AP-DoT", "AP-burst", "Poke"],
    coreBuild: [
      {
        position: "MIDDLE",
        items: [
          "6653", // Liandry's — DoT signature
          "3020",
          "3135", // Void Staff
          "3165", // Morellonomicon (anti-heal AP)
        ],
        cite: "Brand AP-DoT path — passive 'Blaze' is a stacking burn; Liandry's amplifies all DoT damage on burning targets. (DDragon:champion:Brand)",
      },
    ],
    powerSpikes: [
      {
        items: ["6653"],
        label: "Liandry's — passive burn amplification online",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "4401",
        reason:
          "Force of Nature scales MR with magic damage taken — Brand's stacking DoT feeds it constantly, the ideal counter to him.",
        cite: "Brand passive 'Blaze' applies a 4-second burn that ticks magic damage. (DDragon:champion:Brand, DDragon:4401)",
      },
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield blocks his Q (Sear) stun on burning targets — denies his lockdown opener.",
        cite: "Brand Q stuns targets already affected by Blaze. (DDragon:champion:Brand, DDragon:3102)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Senna: {
    id: "Senna",
    name: "Senna",
    positions: ["BOTTOM", "UTILITY"],
    intrinsicThreatTypes: ["AD-sustained", "Poke", "Healing"],
    coreBuild: [
      {
        position: "BOTTOM",
        items: [
          "3508", // Essence Reaver / source of life-stealing soul-scaling
          "3006",
          "3036", // Lord Dominik's
          "6675", // Navori Quickblades or similar
          "3072",
        ],
        cite: "Senna scales infinitely with souls (passive 'Absolution'). Long range + crit conversion makes her uncatchable late. (DDragon:champion:Senna)",
      },
    ],
    powerSpikes: [
      {
        items: ["3508"],
        label: "Essence Reaver / mythic — soul-stacking begins compounding",
        threatLevel: "medium",
      },
    ],
    counteredBy: [
      {
        itemId: "3033",
        reason:
          "Mortal Reminder cuts her Q (Piercing Darkness) heal — Senna's W lets her heal an ally with her Q hit; antiheal blocks that core enchanter pattern.",
        cite: "Senna Q heals self/allies on champion hit (with W active). (DDragon:champion:Senna, DDragon:3033)",
      },
      {
        itemId: "3110",
        reason:
          "Frozen Heart attack-speed slow neuters her sustained range carry pattern.",
        cite: "DDragon:3110",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Leona: {
    id: "Leona",
    name: "Leona",
    positions: ["UTILITY"],
    intrinsicThreatTypes: ["Engage", "CC-chain", "Tank"],
    coreBuild: [
      {
        position: "UTILITY",
        items: [
          "3190", // Locket
          "3111",
          "3050", // Zeke's Convergence — synergy with engage support's R
          "3193", // Gargoyle Stoneplate — survive committed engage
        ],
        cite: "Leona engage support — Zeke's pairs with R lockdown to amp ally damage on the engaged target. (DDragon:champion:Leona)",
      },
    ],
    powerSpikes: [
      {
        items: ["3190"],
        label: "Locket up — engage + team shield combo",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses her R (Solar Flare) center-stun OR her Q (Shield of Daybreak) point-and-click stun — pick whichever lockdown is currently chained.",
        cite: "Leona Q is a point-and-click stun on next auto. R 'Solar Flare' AOEs stun the center. (DDragon:champion:Leona, DDragon:3140)",
      },
      {
        itemId: "3814",
        reason:
          "Edge of Night spell-shield blocks her E (Zenith Blade) dash — her primary engage tool from range.",
        cite: "Leona E dashes to a target hit by the line. Spell-shield consumes the dash. (DDragon:champion:Leona, DDragon:3814)",
      },
      {
        itemId: "3111",
        reason:
          "Mercury's Treads tenacity reduces her chained CC durations (Q stun → E root → R stun).",
        cite: "DDragon:3111",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Nautilus: {
    id: "Nautilus",
    name: "Nautilus",
    positions: ["UTILITY", "JUNGLE"],
    intrinsicThreatTypes: ["Engage", "CC-chain", "Tank"],
    coreBuild: [
      {
        position: "UTILITY",
        items: [
          "3190",
          "3111",
          "3050",
          "3193",
        ],
        cite: "Nautilus tanky engage support — same enchanter-engage stack as Leona. (DDragon:champion:Nautilus)",
      },
    ],
    powerSpikes: [
      {
        items: ["3190"],
        label: "Locket up — hook + ult lockdown chain enabled",
        threatLevel: "high",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield blocks his Q (Dredge Line) hook — without the hook landing, his entire engage stalls (same problem as Thresh).",
        cite: "Nautilus Q is a single-target hook that pulls the holder. (DDragon:champion:Nautilus, DDragon:3102)",
      },
      {
        itemId: "3814",
        reason:
          "Edge of Night for AD carries — same hook-block effect on the AD side.",
        cite: "DDragon:3814",
      },
      {
        itemId: "3140",
        reason:
          "Quicksilver Sash cleanses his R (Depth Charge) chase-stun — denies the carry kill confirm.",
        cite: "Nautilus R applies a delayed stun on the targeted enemy. (DDragon:champion:Nautilus, DDragon:3140)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },

  Thresh: {
    id: "Thresh",
    name: "Thresh",
    positions: ["UTILITY"],
    // Thresh is a hook-engage support with single-target lockdown (Q hook),
    // a flay/displacement (E), and an AoE slow box (R). Vulnerable to spell
    // shields blocking his hook — once Q is dodged or shielded, his entire
    // engage threat is reset.
    intrinsicThreatTypes: ["Engage", "CC-chain"],
    coreBuild: [
      {
        position: "UTILITY",
        items: [
          "3190", // Locket of the Iron Solari (team shield to follow up engage)
          "3111", // Mercury's Treads
          "3050", // Zeke's Convergence (or similar engage support legendary)
          "3222", // Mikael's Blessing (cleanse for the carry he engages with)
        ],
        cite: "Thresh engage-support — team shield + cleanse complement his hook lockdown. (DDragon:champion:Thresh)",
      },
    ],
    powerSpikes: [
      {
        items: ["3190"],
        label: "Locket up — team-fight engage tool active",
        threatLevel: "medium",
      },
    ],
    counteredBy: [
      {
        itemId: "3102",
        reason:
          "Banshee's Veil spell-shield blocks his Q hook — without the hook landing, his entire engage stalls.",
        cite: "Thresh Q 'Death Sentence' is a single-target hook ability that consumes spell shields. (DDragon:champion:Thresh, DDragon:3102)",
      },
      {
        itemId: "3814",
        reason:
          "Edge of Night for AD carries — same hook-block effect as Banshee's, on the AD side of the team.",
        cite: "DDragon:3814",
      },
      {
        itemId: "3111",
        reason:
          "Mercury's Treads tenacity reduces his Flay (E) knockback / slow duration — shortens the followup window after a hook lands.",
        cite: "Thresh E 'Flay' applies a brief knockback + slow. Tenacity shortens the slow. (DDragon:champion:Thresh, DDragon:3111)",
      },
    ],
    patchPinned: PATCH_PINNED,
  },
};

export function getCuratedChampion(championId: string): CuratedChampion | undefined {
  return CURATED_CHAMPIONS[championId];
}

export function hasChampionEntry(championId: string): boolean {
  return championId in CURATED_CHAMPIONS;
}
