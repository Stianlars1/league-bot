/**
 * Counter-graph: maps semantic enemy threat types to ordered counter items.
 *
 * Every counter entry includes:
 *   - itemId: Riot Data Dragon item ID (stable across patches)
 *   - priority: lower number = higher priority (1 is highest)
 *   - reason: why this item works against this threat (mechanic, not vibes)
 *   - cite: source for the mechanic claim. "DDragon:NNNN" points to the
 *     authoritative Riot item description in Data Dragon item.json (the
 *     `description` and `plaintext` fields of item NNNN). All claims are
 *     traceable; LoL Wiki used as a secondary source for mechanic phrasing.
 *
 * Entries are pinned to a major patch via `patchPinned`. The recommender
 * (see recommender-l2.ts) logs a warning when current patch differs by
 * more than one major version — surfaces drift before it gets shipped.
 */

import type { ThreatType } from "../../types";

export interface CounterEntry {
  itemId: string;
  priority: 1 | 2 | 3 | 4;
  reason: string;
  cite: string;
}

export interface CounterGraphEntry {
  threatType: ThreatType;
  description: string;
  /** Major-patch pin — entries verified accurate as of this patch. */
  patchPinned: string;
  items: CounterEntry[];
}

const PATCH_PINNED = "14";

export const COUNTER_GRAPH: Record<ThreatType, CounterGraphEntry> = {
  "AP-burst": {
    threatType: "AP-burst",
    description: "Single-target magic burst combos (LeBlanc, Syndra, Veigar, Annie, Ahri).",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "3140",
        priority: 1,
        reason:
          "Quicksilver Sash active removes all crowd control — most AP-burst combos start with a CC opener (E-Q, stun, knockup) that QSS clears, breaking the kill window.",
        cite: "DDragon:3140 (active: cleanses CC)",
      },
      {
        itemId: "3102",
        priority: 2,
        reason:
          "Banshee's Veil spell-shield blocks the next ENEMY ability — eats the burst opener (LeBlanc Q, Syndra E, Veigar W) before it lands.",
        cite: "DDragon:3102 (passive: spell shield)",
      },
      {
        itemId: "3157",
        priority: 3,
        reason:
          "Zhonya's Hourglass stasis interrupts the burst combo mid-cast and outwaits the assassin's window.",
        cite: "DDragon:3157 (active: 2.5s stasis)",
      },
      {
        itemId: "3156",
        priority: 4,
        reason:
          "Maw of Malmortius lifeline shield triggers under low HP, absorbing magic damage and granting Magic Resist — saves the kill confirm.",
        cite: "DDragon:3156 (passive: Lifeline magic-damage shield)",
      },
    ],
  },

  "AP-DoT": {
    threatType: "AP-DoT",
    description:
      "Sustained magic damage — burn / DoT / persistent zones (Brand, Cassiopeia, Singed, Liandry-stacking mages).",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "4401",
        priority: 1,
        reason:
          "Force of Nature passive stacks Magic Resist as you take magic damage; sustained DoT feeds the stacks faster than burst, making this its strongest counter.",
        cite: "DDragon:4401 (passive: Absorb stacks MR per magic damage taken)",
      },
      {
        itemId: "3065",
        priority: 2,
        reason:
          "Spirit Visage boosts incoming healing and shielding by ~25%, neutralising sustained damage if you have any heal source (Conqueror, Death's Dance, lifesteal).",
        cite: "DDragon:3065 (passive: heal/shield amp)",
      },
      {
        itemId: "3156",
        priority: 3,
        reason:
          "Maw lifeline still triggers under DoT pressure — less optimal than vs burst but still meaningfully reduces magic damage taken once you fall below the threshold.",
        cite: "DDragon:3156 (passive: Lifeline magic-damage shield)",
      },
    ],
  },

  "AD-burst": {
    threatType: "AD-burst",
    description: "Lethality assassins and ranged-AD burst (Zed, Talon, Kha'Zix, Akshan, lethality Jhin).",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "3047",
        priority: 1,
        reason:
          "Plated Steelcaps reduces basic-attack damage from champions — most AD-burst comes with a follow-up auto-reset (Zed Q+auto, Kha-Zix Q+auto), and the reduction is uniquely valuable here.",
        cite: "DDragon:3047 (passive: ranged basic-attack damage reduction)",
      },
      {
        itemId: "3026",
        priority: 2,
        reason:
          "Guardian Angel revives the holder for 4 seconds after death — completely negates a burst-confirm if you survive the initial combo with any HP.",
        cite: "DDragon:3026 (passive: revive)",
      },
      {
        itemId: "3814",
        priority: 3,
        reason:
          "Edge of Night spell-shield blocks the next ability — eats Zed ult mark, Talon W, or Kha'Zix Q proc.",
        cite: "DDragon:3814 (active: spell shield)",
      },
      {
        itemId: "3140",
        priority: 4,
        reason:
          "Quicksilver Sash cleanses Zed-ult deathmark / Talon ult / Akshan ult-fall — the irrecoverable lockdowns that AD-burst comps stack.",
        cite: "DDragon:3140 (active: cleanses CC including ult marks)",
      },
    ],
  },

  "AD-sustained": {
    threatType: "AD-sustained",
    description:
      "DPS auto-attack carries (Yone, Yasuo, Vayne, ADCs in extended trades — anyone whose damage compounds over time, not in one combo).",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "3110",
        priority: 1,
        reason:
          "Frozen Heart aura slows attack speed of nearby enemies — directly counters auto-attack DPS over the duration of a fight.",
        cite: "DDragon:3110 (passive: aura attack-speed slow)",
      },
      {
        itemId: "3047",
        priority: 2,
        reason:
          "Plated Steelcaps reduces incoming basic-attack damage — every auto in an extended trade comes through reduced.",
        cite: "DDragon:3047 (passive: basic-attack damage reduction)",
      },
      {
        itemId: "3143",
        priority: 3,
        reason:
          "Randuin's Omen reduces incoming critical-strike damage — specifically valuable vs ADC late game when most damage is crit.",
        cite: "DDragon:3143 (passive: crit-damage reduction)",
      },
    ],
  },

  "AD-attackspeed": {
    threatType: "AD-attackspeed",
    description: "Pure attack-speed reliant champions (Master Yi, Tryndamere, Kayle, Kog'Maw, Vayne).",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "3110",
        priority: 1,
        reason:
          "Frozen Heart's attack-speed slow aura is the textbook counter to AS-reliant champs — it neuters their core stat at range.",
        cite: "DDragon:3110 (passive: aura attack-speed slow)",
      },
      {
        itemId: "3143",
        priority: 2,
        reason: "Randuin's Omen further reduces crit / on-hit damage compounding from sustained autos.",
        cite: "DDragon:3143 (passive: crit-damage reduction)",
      },
    ],
  },

  Tank: {
    threatType: "Tank",
    description: "%HP-walled frontliners that don't die to flat damage (Cho'Gath, Sion, Malphite, Ornn, K'Sante).",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "3036",
        priority: 1,
        reason:
          "Lord Dominik's bonus damage scales with the target's max HP advantage — purpose-built for shredding stacked-HP tanks.",
        cite: "DDragon:3036 (passive: Giant Slayer)",
      },
      {
        itemId: "6653",
        priority: 2,
        reason:
          "Liandry's Torment does %-current-HP magic damage on ability hits — bypasses HP stacking entirely on the AP path.",
        cite: "DDragon:6653 (passive: %current-HP burn)",
      },
      {
        itemId: "3071",
        priority: 3,
        reason:
          "Black Cleaver applies Carve stacks that shred enemy armor — buffs the whole team's damage into the tank.",
        cite: "DDragon:3071 (passive: Carve armor reduction)",
      },
      {
        itemId: "3153",
        priority: 4,
        reason:
          "Blade of the Ruined King on-hit %current-HP damage — strongest on attack-speed AD that auto-attacks the tank repeatedly.",
        cite: "DDragon:3153 (passive: Mist's Edge %current-HP on-hit)",
      },
    ],
  },

  Healing: {
    threatType: "Healing",
    description:
      "Active sustain — champions/items that heal materially during fights (Aatrox, Soraka, Vladimir, Goredrinker users, Redemption supports).",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "3033",
        priority: 1,
        reason:
          "Mortal Reminder applies Grievous Wounds (40% reduced healing) on physical-damage hits to low-HP champions — the canonical AD antiheal.",
        cite: "DDragon:3033 (passive: Sentence Grievous Wounds)",
      },
      {
        itemId: "3165",
        priority: 1,
        reason:
          "Morellonomicon applies Grievous Wounds on magic-damage hits to low-HP champions — the canonical AP antiheal mirror to Mortal Reminder.",
        cite: "DDragon:3165 (passive: Affliction Grievous Wounds)",
      },
      {
        itemId: "3076",
        priority: 2,
        reason:
          "Bramble Vest applies Grievous Wounds when struck by basic attacks — cheap early-game antiheal for armor-buyers vs AD healers (Aatrox, lifesteal carries).",
        cite: "DDragon:3076 (passive: Thorns Grievous Wounds on auto-receive)",
      },
      {
        itemId: "3123",
        priority: 3,
        reason:
          "Executioner's Calling — earliest AD antiheal component (800g). Rush in lane vs healing matchups, builds into Mortal Reminder.",
        cite: "DDragon:3123 (passive: Grievous Wounds AD component)",
      },
      {
        itemId: "3916",
        priority: 3,
        reason:
          "Oblivion Orb — earliest AP antiheal component (800g). Rush in lane vs AP healers (Vladimir, Swain), builds into Morellonomicon.",
        cite: "DDragon:3916 (passive: Grievous Wounds AP component)",
      },
      {
        itemId: "6609",
        priority: 4,
        reason:
          "Chempunk Chainsword — bruiser-path AD antiheal with Health + AD stats. Built on AD fighters who can't slot Mortal Reminder.",
        cite: "DDragon:6609 (passive: Grievous Wounds + AD/HP)",
      },
    ],
  },

  Shielding: {
    threatType: "Shielding",
    description: "Active shielding sources (Lulu, Janna, Karma, Lux, Senna).",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "6695",
        priority: 1,
        reason:
          "Serpent's Fang reduces enemy shield strength when received (~50%) and applies a shield-cull when you damage shielded targets — directly neutralises shield carries.",
        cite: "DDragon:6695 (passive: Shield Reaver)",
      },
    ],
  },

  "CC-chain": {
    threatType: "CC-chain",
    description:
      "Reliable lockdown chains (Leona+ADC, Nautilus+Yasuo, Maokai+Sejuani comps that point-and-click immobilize).",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "3111",
        priority: 1,
        reason:
          "Mercury's Treads grants 30% Tenacity — reduces the duration of crowd-control effects, which is what 'CC-chain' comps spend their entire kit applying.",
        cite: "DDragon:3111 (passive: Tenacity)",
      },
      {
        itemId: "3140",
        priority: 2,
        reason:
          "Quicksilver Sash active immediately removes all crowd control — breaks the chain at any link.",
        cite: "DDragon:3140 (active: Quicksilver cleanse)",
      },
      {
        itemId: "3814",
        priority: 3,
        reason:
          "Edge of Night spell-shield blocks the first link of the chain (e.g., Leona E or Naut Q) — without the opener, the rest of the combo can't connect.",
        cite: "DDragon:3814 (active: spell shield)",
      },
    ],
  },

  Engage: {
    threatType: "Engage",
    description:
      "Hard committed engage abilities (Malphite ult, Leona E, Nocturne ult, Hecarim ult, Kennen ult).",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "3222",
        priority: 1,
        reason:
          "Mikael's Blessing active cleanses an ally and grants them temporary Tenacity + heal — the team-wide answer to a single big engage spell.",
        cite: "DDragon:3222 (active: ally cleanse + heal)",
      },
      {
        itemId: "3190",
        priority: 2,
        reason:
          "Locket of the Iron Solari active grants a wide team shield — absorbs the burst window during the engage's CC duration.",
        cite: "DDragon:3190 (active: team shield)",
      },
      {
        itemId: "3814",
        priority: 3,
        reason:
          "Edge of Night spell-shield on a key carry blocks the engage ability outright. Best when ONE engage ability is the comp's only setup.",
        cite: "DDragon:3814 (active: spell shield)",
      },
    ],
  },

  "AP-sustained": {
    threatType: "AP-sustained",
    description: "Sustained ranged AP DPS (Cassiopeia poke, Vel'Koz, control mage in extended fights).",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "4401",
        priority: 1,
        reason:
          "Force of Nature scales MR with magic damage taken — sustained AP feeds it constantly, making it the highest-EHP MR option in the game vs this profile.",
        cite: "DDragon:4401 (passive: Absorb stacks)",
      },
      {
        itemId: "3065",
        priority: 2,
        reason:
          "Spirit Visage boosts incoming healing/shielding — pairs with any sustain source to outlast the AP DPS.",
        cite: "DDragon:3065 (passive: heal/shield amp)",
      },
    ],
  },

  Poke: {
    threatType: "Poke",
    description: "Long-range chip damage (Xerath, Jayce, Caitlyn, Varus). Goal: don't die before the fight.",
    patchPinned: PATCH_PINNED,
    items: [
      {
        itemId: "4401",
        priority: 1,
        reason:
          "Force of Nature for AP poke (Xerath, Vel'Koz, Ziggs). Sustained MR scaling outlasts long fights.",
        cite: "DDragon:4401 (passive: Absorb stacks)",
      },
    ],
  },

  Roam: {
    threatType: "Roam",
    description:
      "Roam-heavy assassins / supports who collect kills off-lane (Pyke, Nocturne, Twisted Fate global). Counter is mostly vision, not items — leaving entry empty rather than guessing.",
    patchPinned: PATCH_PINNED,
    items: [],
  },
};

/** True when a curated entry exists with at least one item for this threat. */
export function hasCounterFor(threatType: ThreatType): boolean {
  return COUNTER_GRAPH[threatType].items.length > 0;
}

/** Look up counter items for a threat type, sorted by priority (1 first). */
export function countersFor(threatType: ThreatType): CounterEntry[] {
  return [...COUNTER_GRAPH[threatType].items].sort((a, b) => a.priority - b.priority);
}
