/**
 * Curated item metadata — semantic threat classification beyond Riot's flat
 * `tags` array. When an enemy completes one of these items, we use the
 * `signals` field to refine the threat type for that enemy:
 *
 *   - Riot tags say Liandry's Torment is "SpellDamage, Health" (just AP+HP).
 *   - This file says it signals "AP-DoT" specifically — sustained damage,
 *     not single-target burst — which routes the recommender to Force of
 *     Nature / Spirit Visage instead of Banshee's Veil / Maw.
 *
 * Coverage is intentionally limited to items that materially CHANGE the
 * threat-type classification when built. Every entry is verifiable from
 * the Riot Data Dragon item description (`cite: "DDragon:NNNN"`).
 *
 * For full counter-build mappings see `counter-graph.ts`. This file is the
 * inverse direction: enemy item presence → enemy threat type.
 *
 * Pinned to major patch via `patchPinned`. `recommender-l2.ts` warns when
 * the live patch differs by more than one major version.
 */

import type { ThreatType } from "../../types";

export interface CuratedItem {
  id: string;
  name: string;
  /** What threat this item signals when an enemy completes it. */
  signals: ThreatType[];
  /** Power-spike weight: how much completing this changes the holder's threat.
   *  1 = component / mild, 2 = legendary / meaningful, 3 = defining (mythic-tier). */
  spikeWeight: 1 | 2 | 3;
  cite: string;
  patchPinned: string;
}

const PATCH_PINNED = "14";

export const CURATED_ITEMS: Record<string, CuratedItem> = {
  // ─────────────────────────────────────────────────────────────────────
  // AP signature items — refine enemy AP threat into burst / DoT / sustain
  // ─────────────────────────────────────────────────────────────────────
  "6653": {
    id: "6653",
    name: "Liandry's Torment",
    signals: ["AP-DoT", "Tank"],
    spikeWeight: 3,
    cite: "DDragon:6653 (passive: %current-HP burn over time)",
    patchPinned: PATCH_PINNED,
  },
  "3152": {
    id: "3152",
    name: "Hextech Rocketbelt",
    signals: ["AP-burst"],
    spikeWeight: 3,
    cite: "DDragon:3152 (active: dash + magic-damage cone)",
    patchPinned: PATCH_PINNED,
  },
  "3100": {
    id: "3100",
    name: "Lich Bane",
    signals: ["AP-burst"],
    spikeWeight: 2,
    cite: "DDragon:3100 (passive: Spellblade — next basic attack deals bonus magic damage)",
    patchPinned: PATCH_PINNED,
  },
  "3115": {
    id: "3115",
    name: "Nashor's Tooth",
    signals: ["AP-sustained"],
    spikeWeight: 2,
    cite: "DDragon:3115 (passive: Icathian Bite on-hit magic damage)",
    patchPinned: PATCH_PINNED,
  },
  "3089": {
    id: "3089",
    name: "Rabadon's Deathcap",
    signals: ["AP-burst"],
    spikeWeight: 3,
    cite: "DDragon:3089 (passive: 30% Ability Power amplification)",
    patchPinned: PATCH_PINNED,
  },
  "3135": {
    id: "3135",
    name: "Void Staff",
    signals: ["AP-burst", "Tank"],
    spikeWeight: 2,
    cite: "DDragon:3135 (passive: 40% Magic Penetration)",
    patchPinned: PATCH_PINNED,
  },

  // ─────────────────────────────────────────────────────────────────────
  // AD signature items
  // ─────────────────────────────────────────────────────────────────────
  "3142": {
    id: "3142",
    name: "Youmuu's Ghostblade",
    signals: ["AD-burst", "Roam"],
    spikeWeight: 3,
    cite: "DDragon:3142 (active: out-of-combat movement speed; lethality)",
    patchPinned: PATCH_PINNED,
  },
  "6692": {
    id: "6692",
    name: "Eclipse",
    signals: ["AD-burst"],
    spikeWeight: 3,
    cite: "DDragon:6692 (passive: Ever Rising Moon — burst damage on two ability hits)",
    patchPinned: PATCH_PINNED,
  },
  "6691": {
    id: "6691",
    name: "Duskblade of Draktharr",
    signals: ["AD-burst", "Roam"],
    spikeWeight: 3,
    cite: "DDragon:6691 (passive: Nightstalker — first attack out of stealth deals bonus damage)",
    patchPinned: PATCH_PINNED,
  },
  "6671": {
    id: "6671",
    name: "Galeforce",
    signals: ["AD-attackspeed", "Roam"],
    spikeWeight: 3,
    cite: "DDragon:6671 (active: Cloudburst dash + bolts on lowest-HP target)",
    patchPinned: PATCH_PINNED,
  },
  "6672": {
    id: "6672",
    name: "Kraken Slayer",
    signals: ["AD-attackspeed", "Tank"],
    spikeWeight: 3,
    cite: "DDragon:6672 (passive: Bring It Down — every 3rd auto deals true damage)",
    patchPinned: PATCH_PINNED,
  },
  "6655": {
    id: "6655",
    name: "Luden's Companion",
    signals: ["AP-burst", "Poke"],
    spikeWeight: 3,
    cite: "DDragon:6655 (passive: Fire Bolts — burst magic damage on ability hit)",
    patchPinned: PATCH_PINNED,
  },
  "6630": {
    id: "6630",
    name: "Goredrinker",
    signals: ["Healing", "AD-sustained"],
    spikeWeight: 3,
    cite: "DDragon:6630 (passive: omnivamp + missing-HP heal active)",
    patchPinned: PATCH_PINNED,
  },
  "6631": {
    id: "6631",
    name: "Stridebreaker",
    signals: ["Healing", "AD-sustained", "Engage"],
    spikeWeight: 3,
    cite: "DDragon:6631 (active: Halting Slash AoE slow + dash; on-hit damage)",
    patchPinned: PATCH_PINNED,
  },
  "3504": {
    id: "3504",
    name: "Ardent Censer",
    signals: ["Shielding", "AP-sustained"],
    spikeWeight: 2,
    cite: "DDragon:3504 (passive: heal/shield → carry attack-speed + on-hit magic dmg buff)",
    patchPinned: PATCH_PINNED,
  },
  "3107": {
    id: "3107",
    name: "Redemption",
    signals: ["Healing", "Shielding"],
    spikeWeight: 2,
    cite: "DDragon:3107 (active: ground-target heal allies + small magic damage to enemies)",
    patchPinned: PATCH_PINNED,
  },
  "3094": {
    id: "3094",
    name: "Rapid Firecannon",
    signals: ["AD-attackspeed", "Poke"],
    spikeWeight: 2,
    cite: "DDragon:3094 (passive: Energized — extra-range crit on first attack)",
    patchPinned: PATCH_PINNED,
  },
  "3036": {
    id: "3036",
    name: "Lord Dominik's Regards",
    signals: ["AD-sustained"],
    spikeWeight: 2,
    cite: "DDragon:3036 (passive: Giant Slayer — bonus damage to higher-max-HP targets)",
    patchPinned: PATCH_PINNED,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Sustain / healing signature items — feed the antiheal rule
  // ─────────────────────────────────────────────────────────────────────
  "3074": {
    id: "3074",
    name: "Ravenous Hydra",
    signals: ["Healing", "AD-sustained"],
    spikeWeight: 3,
    cite: "DDragon:3074 (passive: Cleave + Lifeline — omnivamp/lifesteal sustain)",
    patchPinned: PATCH_PINNED,
  },
  "3072": {
    id: "3072",
    name: "Bloodthirster",
    signals: ["Healing", "AD-sustained"],
    spikeWeight: 3,
    cite: "DDragon:3072 (passive: Engulfing Shield — lifesteal + overheal shield)",
    patchPinned: PATCH_PINNED,
  },
  "6333": {
    id: "6333",
    name: "Death's Dance",
    signals: ["Healing", "AD-sustained"],
    spikeWeight: 3,
    cite: "DDragon:6333 (passive: Ignore Pain + Defy — bleed conversion + heal on takedown)",
    patchPinned: PATCH_PINNED,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Tank signature items
  // ─────────────────────────────────────────────────────────────────────
  "3068": {
    id: "3068",
    name: "Sunfire Aegis",
    signals: ["Tank"],
    spikeWeight: 3,
    cite: "DDragon:3068 (passive: Immolate — magic damage aura while in combat)",
    patchPinned: PATCH_PINNED,
  },
  "3193": {
    id: "3193",
    name: "Gargoyle Stoneplate",
    signals: ["Tank"],
    spikeWeight: 2,
    cite: "DDragon:3193 (active: Metallicize — temporary HP boost when surrounded)",
    patchPinned: PATCH_PINNED,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Engage signature items — when supports build these, the comp is
  // committed to wombo-engage even if the champion isn't classically tagged
  // ─────────────────────────────────────────────────────────────────────
  "3110": {
    id: "3110",
    name: "Frozen Heart",
    signals: ["Tank"],
    spikeWeight: 2,
    cite: "DDragon:3110 (passive: Winter's Caress — aura attack-speed slow)",
    patchPinned: PATCH_PINNED,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Lethality stack — multiple of these on a build = AD-burst commitment
  // ─────────────────────────────────────────────────────────────────────
  "6697": {
    id: "6697",
    name: "Hubris",
    signals: ["AD-burst", "Roam"],
    spikeWeight: 3,
    cite: "DDragon:6697 (passive: Eminence — kills/assists grant temporary AD)",
    patchPinned: PATCH_PINNED,
  },
  "6698": {
    id: "6698",
    name: "Profane Hydra",
    signals: ["AD-burst"],
    spikeWeight: 3,
    cite: "DDragon:6698 (active: Heretical Cleave — execute AOE on low-HP target)",
    patchPinned: PATCH_PINNED,
  },
  "6694": {
    id: "6694",
    name: "Serylda's Grudge",
    signals: ["AD-burst", "Tank", "CC-chain"],
    spikeWeight: 2,
    cite: "DDragon:6694 (passive: Bitter Cold — armor pen + ability damage applies slow)",
    patchPinned: PATCH_PINNED,
  },
  "6696": {
    id: "6696",
    name: "Axiom Arc",
    signals: ["AD-burst", "Roam"],
    spikeWeight: 2,
    cite: "DDragon:6696 (passive: Flux — ult cooldown refund on takedowns)",
    patchPinned: PATCH_PINNED,
  },

  // ─────────────────────────────────────────────────────────────────────
  // AD bruiser cores — signal sustained engage commitment
  // ─────────────────────────────────────────────────────────────────────
  "3078": {
    id: "3078",
    name: "Trinity Force",
    signals: ["Engage", "AD-sustained"],
    spikeWeight: 3,
    cite: "DDragon:3078 (passive: Threefold Strike — Sheen proc + MS on champion damage)",
    patchPinned: PATCH_PINNED,
  },
  "3071": {
    id: "3071",
    name: "Black Cleaver",
    signals: ["Tank", "AD-sustained"],
    spikeWeight: 2,
    cite: "DDragon:3071 (passive: Carve — physical damage applies stacking armor reduction)",
    patchPinned: PATCH_PINNED,
  },
  "3053": {
    id: "3053",
    name: "Sterak's Gage",
    signals: ["Healing", "AD-sustained"],
    spikeWeight: 2,
    cite: "DDragon:3053 (passive: Lifeline — magic-resistance shield triggers under low HP)",
    patchPinned: PATCH_PINNED,
  },
  "3004": {
    id: "3004",
    name: "Manamune",
    signals: ["AD-sustained", "Poke"],
    spikeWeight: 2,
    cite: "DDragon:3004 (passive: Awe + Shock — mana stacking grants AD; transforms into Muramana)",
    patchPinned: PATCH_PINNED,
  },
  "3042": {
    id: "3042",
    name: "Muramana",
    signals: ["AD-sustained", "Poke"],
    spikeWeight: 3,
    cite: "DDragon:3042 (passive: Shock — abilities and basic attacks deal bonus damage scaling with mana)",
    patchPinned: PATCH_PINNED,
  },

  // ─────────────────────────────────────────────────────────────────────
  // AD ADC items — refine attack-speed/sustained classification
  // ─────────────────────────────────────────────────────────────────────
  "6673": {
    id: "6673",
    name: "Immortal Shieldbow",
    signals: ["AD-sustained", "Healing"],
    spikeWeight: 3,
    cite: "DDragon:6673 (passive: Lifeline — shield + lifesteal triggered under low HP)",
    patchPinned: PATCH_PINNED,
  },
  "6676": {
    id: "6676",
    name: "The Collector",
    signals: ["AD-burst", "Tank"],
    spikeWeight: 2,
    cite: "DDragon:6676 (passive: Death — execute champions below 5% HP)",
    patchPinned: PATCH_PINNED,
  },
  "6675": {
    id: "6675",
    name: "Navori Flickerblade",
    signals: ["AD-attackspeed", "AD-sustained"],
    spikeWeight: 2,
    cite: "DDragon:6675 (passive: Transcendence — basic attacks reduce non-ult cooldowns)",
    patchPinned: PATCH_PINNED,
  },
  "3046": {
    id: "3046",
    name: "Phantom Dancer",
    signals: ["AD-attackspeed", "AD-sustained"],
    spikeWeight: 2,
    cite: "DDragon:3046 (passive: Spectral Waltz — MS + ramping AS on basic attacks)",
    patchPinned: PATCH_PINNED,
  },
  "3085": {
    id: "3085",
    name: "Runaan's Hurricane",
    signals: ["AD-attackspeed"],
    spikeWeight: 2,
    cite: "DDragon:3085 (passive: Wind's Fury — basic attacks fire bolts at additional targets)",
    patchPinned: PATCH_PINNED,
  },

  // ─────────────────────────────────────────────────────────────────────
  // AP signature items — refine burst/DoT/sustained classification
  // ─────────────────────────────────────────────────────────────────────
  "4645": {
    id: "4645",
    name: "Shadowflame",
    signals: ["AP-burst"],
    spikeWeight: 2,
    cite: "DDragon:4645 (passive: Cinderbloom — magic damage critically strikes shielded/low-HP targets)",
    patchPinned: PATCH_PINNED,
  },
  "4637": {
    id: "4637",
    name: "Demonic Embrace",
    signals: ["AP-DoT", "Tank"],
    spikeWeight: 2,
    cite: "DDragon:4637 (passive: Azakana Gaze — magic damage burns target for % max HP)",
    patchPinned: PATCH_PINNED,
  },
  "4629": {
    id: "4629",
    name: "Cosmic Drive",
    signals: ["AP-sustained", "Roam"],
    spikeWeight: 2,
    cite: "DDragon:4629 (passive: Spelldance — ability haste + MS on champion ability hit)",
    patchPinned: PATCH_PINNED,
  },
  "3116": {
    id: "3116",
    name: "Rylai's Crystal Scepter",
    signals: ["AP-DoT", "CC-chain"],
    spikeWeight: 2,
    cite: "DDragon:3116 (passive: Rimefrost — abilities apply slow on hit)",
    patchPinned: PATCH_PINNED,
  },
  "6657": {
    id: "6657",
    name: "Riftmaker",
    signals: ["AP-sustained", "Healing", "Tank"],
    spikeWeight: 3,
    cite: "DDragon:6657 (passive: Void Corruption — extended-fight true-damage ramp + omnivamp)",
    patchPinned: PATCH_PINNED,
  },

  // ─────────────────────────────────────────────────────────────────────
  // Hybrid + tank signature items
  // ─────────────────────────────────────────────────────────────────────
  "3091": {
    id: "3091",
    name: "Wit's End",
    signals: ["AD-attackspeed"],
    spikeWeight: 2,
    cite: "DDragon:3091 (passive: At Wit's End — on-hit magic damage; built by AS-skirmishers facing AP)",
    patchPinned: PATCH_PINNED,
  },
  "3742": {
    id: "3742",
    name: "Dead Man's Plate",
    signals: ["Tank", "Engage"],
    spikeWeight: 2,
    cite: "DDragon:3742 (passive: Shipwrecker — MS stack on movement; next auto stuns)",
    patchPinned: PATCH_PINNED,
  },
  "6664": {
    id: "6664",
    name: "Heartsteel",
    signals: ["Tank"],
    spikeWeight: 3,
    cite: "DDragon:6664 (passive: Colossal Consumption — first-hit empowered with stacking max-HP damage)",
    patchPinned: PATCH_PINNED,
  },
  "6665": {
    id: "6665",
    name: "Jak'Sho, the Protean",
    signals: ["Tank"],
    spikeWeight: 3,
    cite: "DDragon:6665 (passive: Voidborn Resilience — stacking resists per nearby champion in extended fight)",
    patchPinned: PATCH_PINNED,
  },
};

export function getCuratedItem(itemId: string): CuratedItem | undefined {
  return CURATED_ITEMS[itemId];
}

/** Aggregate the threat types signaled by an enemy's completed items. */
export function signalsFromItems(itemIds: readonly string[]): ThreatType[] {
  const signals = new Set<ThreatType>();
  for (const id of itemIds) {
    const curated = CURATED_ITEMS[id];
    if (!curated) continue;
    for (const s of curated.signals) signals.add(s);
  }
  return [...signals];
}
