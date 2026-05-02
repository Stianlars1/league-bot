/**
 * Hand-curated Dota 2 hero metadata for the recommender. Keys match Stratz/
 * OpenDota `name` (e.g. "npc_dota_hero_antimage") OR short id ("antimage").
 *
 * damageType:
 *   "physical" → right-click + bonus damage. Counter with armor.
 *   "magical"  → spell-based. Counter with magic resist (Pipe, Hood, Glimmer).
 *   "pure"     → bypasses both. Counter with HP / dispel.
 *
 * Tags (open set):
 *   "healing"   — sustain heroes → Spirit Vessel / Eternal Shroud
 *   "shielding" — barriers → break / dispel
 *   "engage"    — initiators → Lotus Orb / dispel
 *   "burst"     — burst-mage assassins → BKB / Linken
 *   "tank"      — tanky frontline → break / armor pen
 *   "stuns"     — heavy lockdown → BKB / Manta
 *   "silences"  — silences → Lotus Orb / Eul's
 *   "carry"     — late-game scaler → end before 35 min
 *   "split"     — splitpush threat → smoke ganks
 *   "evasion"   — high evasion → MKB / Bloodthorn
 *   "illusion"  — illusion army → Battle Fury / AoE
 */

export interface DotaHeroMeta {
  id: string; // short id, e.g. "antimage"
  shortName: string; // matches Stratz `shortName`
  name: string; // pretty
  primaryAttribute: "strength" | "agility" | "intelligence" | "universal";
  damageType: "physical" | "magical" | "hybrid";
  tags: string[];
  roles: string[]; // "carry" | "support" | "initiator" | ...
}

const H: DotaHeroMeta[] = [
  // Strength
  { id: "axe", shortName: "axe", name: "Axe", primaryAttribute: "strength", damageType: "physical", tags: ["tank", "engage"], roles: ["initiator", "tank"] },
  { id: "abaddon", shortName: "abaddon", name: "Abaddon", primaryAttribute: "universal", damageType: "physical", tags: ["healing", "shielding", "tank"], roles: ["support", "tank"] },
  { id: "bristleback", shortName: "bristleback", name: "Bristleback", primaryAttribute: "strength", damageType: "magical", tags: ["tank", "carry"], roles: ["carry", "tank"] },
  { id: "centaur", shortName: "centaur", name: "Centaur Warrunner", primaryAttribute: "strength", damageType: "physical", tags: ["tank", "engage"], roles: ["initiator", "tank"] },
  { id: "chaos_knight", shortName: "chaos_knight", name: "Chaos Knight", primaryAttribute: "strength", damageType: "physical", tags: ["illusion", "carry"], roles: ["carry"] },
  { id: "dawnbreaker", shortName: "dawnbreaker", name: "Dawnbreaker", primaryAttribute: "strength", damageType: "physical", tags: ["healing", "engage"], roles: ["support", "initiator"] },
  { id: "doom", shortName: "doom_bringer", name: "Doom", primaryAttribute: "strength", damageType: "magical", tags: ["silences", "tank"], roles: ["initiator"] },
  { id: "dragon_knight", shortName: "dragon_knight", name: "Dragon Knight", primaryAttribute: "strength", damageType: "physical", tags: ["tank", "carry"], roles: ["carry"] },
  { id: "earthshaker", shortName: "earthshaker", name: "Earthshaker", primaryAttribute: "strength", damageType: "magical", tags: ["stuns", "engage", "burst"], roles: ["initiator", "support"] },
  { id: "elder_titan", shortName: "elder_titan", name: "Elder Titan", primaryAttribute: "strength", damageType: "magical", tags: ["stuns"], roles: ["support", "initiator"] },
  { id: "huskar", shortName: "huskar", name: "Huskar", primaryAttribute: "strength", damageType: "magical", tags: ["healing", "carry"], roles: ["carry"] },
  { id: "kunkka", shortName: "kunkka", name: "Kunkka", primaryAttribute: "strength", damageType: "physical", tags: ["stuns", "engage"], roles: ["initiator", "carry"] },
  { id: "legion_commander", shortName: "legion_commander", name: "Legion Commander", primaryAttribute: "universal", damageType: "physical", tags: ["engage", "carry"], roles: ["carry", "initiator"] },
  { id: "lifestealer", shortName: "life_stealer", name: "Lifestealer", primaryAttribute: "strength", damageType: "physical", tags: ["tank", "carry", "healing"], roles: ["carry"] },
  { id: "mars", shortName: "mars", name: "Mars", primaryAttribute: "strength", damageType: "physical", tags: ["engage", "tank"], roles: ["initiator", "tank"] },
  { id: "night_stalker", shortName: "night_stalker", name: "Night Stalker", primaryAttribute: "strength", damageType: "physical", tags: ["silences", "engage"], roles: ["initiator"] },
  { id: "omniknight", shortName: "omniknight", name: "Omniknight", primaryAttribute: "strength", damageType: "magical", tags: ["healing", "shielding"], roles: ["support"] },
  { id: "primal_beast", shortName: "primal_beast", name: "Primal Beast", primaryAttribute: "strength", damageType: "magical", tags: ["stuns", "engage"], roles: ["initiator"] },
  { id: "pudge", shortName: "pudge", name: "Pudge", primaryAttribute: "strength", damageType: "magical", tags: ["stuns", "engage"], roles: ["support", "initiator"] },
  { id: "slardar", shortName: "slardar", name: "Slardar", primaryAttribute: "strength", damageType: "physical", tags: ["stuns", "engage"], roles: ["initiator"] },
  { id: "spirit_breaker", shortName: "spirit_breaker", name: "Spirit Breaker", primaryAttribute: "strength", damageType: "physical", tags: ["stuns", "engage"], roles: ["initiator"] },
  { id: "sven", shortName: "sven", name: "Sven", primaryAttribute: "strength", damageType: "physical", tags: ["stuns", "carry"], roles: ["carry"] },
  { id: "tidehunter", shortName: "tidehunter", name: "Tidehunter", primaryAttribute: "strength", damageType: "magical", tags: ["stuns", "engage", "tank"], roles: ["initiator", "tank"] },
  { id: "tiny", shortName: "tiny", name: "Tiny", primaryAttribute: "strength", damageType: "magical", tags: ["stuns", "burst"], roles: ["support", "carry"] },
  { id: "treant", shortName: "treant_protector", name: "Treant Protector", primaryAttribute: "strength", damageType: "magical", tags: ["healing", "stuns"], roles: ["support"] },
  { id: "tusk", shortName: "tusk", name: "Tusk", primaryAttribute: "universal", damageType: "physical", tags: ["stuns", "engage"], roles: ["initiator"] },
  { id: "underlord", shortName: "abyssal_underlord", name: "Underlord", primaryAttribute: "strength", damageType: "magical", tags: ["tank"], roles: ["tank"] },
  { id: "undying", shortName: "undying", name: "Undying", primaryAttribute: "strength", damageType: "magical", tags: ["tank"], roles: ["support", "tank"] },
  { id: "wraith_king", shortName: "skeleton_king", name: "Wraith King", primaryAttribute: "strength", damageType: "physical", tags: ["stuns", "carry"], roles: ["carry"] },

  // Agility
  { id: "antimage", shortName: "antimage", name: "Anti-Mage", primaryAttribute: "agility", damageType: "physical", tags: ["carry", "split"], roles: ["carry"] },
  { id: "arc_warden", shortName: "arc_warden", name: "Arc Warden", primaryAttribute: "agility", damageType: "physical", tags: ["carry", "split"], roles: ["carry"] },
  { id: "bloodseeker", shortName: "bloodseeker", name: "Bloodseeker", primaryAttribute: "universal", damageType: "physical", tags: ["silences", "carry"], roles: ["carry"] },
  { id: "bounty_hunter", shortName: "bounty_hunter", name: "Bounty Hunter", primaryAttribute: "agility", damageType: "physical", tags: [], roles: ["support"] },
  { id: "broodmother", shortName: "broodmother", name: "Broodmother", primaryAttribute: "agility", damageType: "physical", tags: ["split", "illusion"], roles: ["carry"] },
  { id: "clinkz", shortName: "clinkz", name: "Clinkz", primaryAttribute: "agility", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "drow_ranger", shortName: "drow_ranger", name: "Drow Ranger", primaryAttribute: "agility", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "ember_spirit", shortName: "ember_spirit", name: "Ember Spirit", primaryAttribute: "universal", damageType: "hybrid", tags: ["burst"], roles: ["carry"] },
  { id: "faceless_void", shortName: "faceless_void", name: "Faceless Void", primaryAttribute: "agility", damageType: "physical", tags: ["stuns", "carry", "engage"], roles: ["carry"] },
  { id: "gyrocopter", shortName: "gyrocopter", name: "Gyrocopter", primaryAttribute: "agility", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "hoodwink", shortName: "hoodwink", name: "Hoodwink", primaryAttribute: "agility", damageType: "magical", tags: ["burst"], roles: ["support"] },
  { id: "juggernaut", shortName: "juggernaut", name: "Juggernaut", primaryAttribute: "agility", damageType: "physical", tags: ["healing", "carry"], roles: ["carry"] },
  { id: "luna", shortName: "luna", name: "Luna", primaryAttribute: "agility", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "medusa", shortName: "medusa", name: "Medusa", primaryAttribute: "agility", damageType: "physical", tags: ["carry", "stuns"], roles: ["carry"] },
  { id: "meepo", shortName: "meepo", name: "Meepo", primaryAttribute: "agility", damageType: "physical", tags: ["illusion", "carry"], roles: ["carry"] },
  { id: "monkey_king", shortName: "monkey_king", name: "Monkey King", primaryAttribute: "agility", damageType: "physical", tags: ["stuns", "carry"], roles: ["carry"] },
  { id: "morphling", shortName: "morphling", name: "Morphling", primaryAttribute: "universal", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "naga_siren", shortName: "naga_siren", name: "Naga Siren", primaryAttribute: "agility", damageType: "physical", tags: ["illusion", "carry"], roles: ["carry"] },
  { id: "nyx_assassin", shortName: "nyx_assassin", name: "Nyx Assassin", primaryAttribute: "agility", damageType: "magical", tags: ["stuns", "burst"], roles: ["support"] },
  { id: "pa", shortName: "phantom_assassin", name: "Phantom Assassin", primaryAttribute: "agility", damageType: "physical", tags: ["burst", "carry", "evasion"], roles: ["carry"] },
  { id: "phantom_lancer", shortName: "phantom_lancer", name: "Phantom Lancer", primaryAttribute: "agility", damageType: "physical", tags: ["illusion", "carry"], roles: ["carry"] },
  { id: "razor", shortName: "razor", name: "Razor", primaryAttribute: "universal", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "riki", shortName: "riki", name: "Riki", primaryAttribute: "agility", damageType: "physical", tags: ["silences", "burst"], roles: ["carry"] },
  { id: "shadow_fiend", shortName: "nevermore", name: "Shadow Fiend", primaryAttribute: "agility", damageType: "magical", tags: ["burst"], roles: ["carry"] },
  { id: "slark", shortName: "slark", name: "Slark", primaryAttribute: "agility", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "sniper", shortName: "sniper", name: "Sniper", primaryAttribute: "agility", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "spectre", shortName: "spectre", name: "Spectre", primaryAttribute: "agility", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "templar_assassin", shortName: "templar_assassin", name: "Templar Assassin", primaryAttribute: "agility", damageType: "physical", tags: ["burst", "carry"], roles: ["carry"] },
  { id: "terrorblade", shortName: "terrorblade", name: "Terrorblade", primaryAttribute: "agility", damageType: "physical", tags: ["illusion", "carry"], roles: ["carry"] },
  { id: "troll_warlord", shortName: "troll_warlord", name: "Troll Warlord", primaryAttribute: "agility", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "ursa", shortName: "ursa", name: "Ursa", primaryAttribute: "agility", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "viper", shortName: "viper", name: "Viper", primaryAttribute: "agility", damageType: "magical", tags: [], roles: ["carry", "support"] },
  { id: "weaver", shortName: "weaver", name: "Weaver", primaryAttribute: "agility", damageType: "physical", tags: ["carry"], roles: ["carry"] },

  // Intelligence
  { id: "ancient_apparition", shortName: "ancient_apparition", name: "Ancient Apparition", primaryAttribute: "intelligence", damageType: "magical", tags: [], roles: ["support"] },
  { id: "bane", shortName: "bane", name: "Bane", primaryAttribute: "universal", damageType: "magical", tags: ["silences", "stuns"], roles: ["support"] },
  { id: "batrider", shortName: "batrider", name: "Batrider", primaryAttribute: "universal", damageType: "magical", tags: ["engage"], roles: ["initiator"] },
  { id: "chen", shortName: "chen", name: "Chen", primaryAttribute: "intelligence", damageType: "magical", tags: ["healing"], roles: ["support"] },
  { id: "crystal_maiden", shortName: "crystal_maiden", name: "Crystal Maiden", primaryAttribute: "intelligence", damageType: "magical", tags: ["stuns"], roles: ["support"] },
  { id: "dark_seer", shortName: "dark_seer", name: "Dark Seer", primaryAttribute: "universal", damageType: "magical", tags: ["engage"], roles: ["initiator"] },
  { id: "dark_willow", shortName: "dark_willow", name: "Dark Willow", primaryAttribute: "universal", damageType: "magical", tags: ["stuns", "burst"], roles: ["support"] },
  { id: "dazzle", shortName: "dazzle", name: "Dazzle", primaryAttribute: "intelligence", damageType: "magical", tags: ["healing", "shielding"], roles: ["support"] },
  { id: "death_prophet", shortName: "death_prophet", name: "Death Prophet", primaryAttribute: "universal", damageType: "magical", tags: ["healing", "split"], roles: ["carry"] },
  { id: "disruptor", shortName: "disruptor", name: "Disruptor", primaryAttribute: "intelligence", damageType: "magical", tags: ["silences", "stuns"], roles: ["support"] },
  { id: "enchantress", shortName: "enchantress", name: "Enchantress", primaryAttribute: "intelligence", damageType: "magical", tags: ["healing"], roles: ["support"] },
  { id: "enigma", shortName: "enigma", name: "Enigma", primaryAttribute: "universal", damageType: "magical", tags: ["stuns", "engage"], roles: ["initiator"] },
  { id: "grimstroke", shortName: "grimstroke", name: "Grimstroke", primaryAttribute: "intelligence", damageType: "magical", tags: ["silences"], roles: ["support"] },
  { id: "invoker", shortName: "invoker", name: "Invoker", primaryAttribute: "universal", damageType: "magical", tags: ["burst", "stuns"], roles: ["carry"] },
  { id: "jakiro", shortName: "jakiro", name: "Jakiro", primaryAttribute: "intelligence", damageType: "magical", tags: ["stuns"], roles: ["support"] },
  { id: "keeper_of_the_light", shortName: "keeper_of_the_light", name: "Keeper of the Light", primaryAttribute: "intelligence", damageType: "magical", tags: ["healing"], roles: ["support"] },
  { id: "leshrac", shortName: "leshrac", name: "Leshrac", primaryAttribute: "universal", damageType: "magical", tags: ["stuns"], roles: ["carry"] },
  { id: "lich", shortName: "lich", name: "Lich", primaryAttribute: "intelligence", damageType: "magical", tags: [], roles: ["support"] },
  { id: "lina", shortName: "lina", name: "Lina", primaryAttribute: "universal", damageType: "magical", tags: ["burst", "stuns"], roles: ["carry"] },
  { id: "lion", shortName: "lion", name: "Lion", primaryAttribute: "intelligence", damageType: "magical", tags: ["stuns", "burst"], roles: ["support"] },
  { id: "muerta", shortName: "muerta", name: "Muerta", primaryAttribute: "intelligence", damageType: "physical", tags: ["carry"], roles: ["carry"] },
  { id: "necrophos", shortName: "necrolyte", name: "Necrophos", primaryAttribute: "intelligence", damageType: "magical", tags: ["healing"], roles: ["carry"] },
  { id: "ogre_magi", shortName: "ogre_magi", name: "Ogre Magi", primaryAttribute: "universal", damageType: "magical", tags: ["stuns"], roles: ["support"] },
  { id: "oracle", shortName: "oracle", name: "Oracle", primaryAttribute: "intelligence", damageType: "magical", tags: ["healing", "shielding"], roles: ["support"] },
  { id: "outworld_destroyer", shortName: "obsidian_destroyer", name: "Outworld Destroyer", primaryAttribute: "universal", damageType: "magical", tags: ["burst"], roles: ["carry"] },
  { id: "puck", shortName: "puck", name: "Puck", primaryAttribute: "universal", damageType: "magical", tags: ["silences", "burst"], roles: ["carry", "initiator"] },
  { id: "pugna", shortName: "pugna", name: "Pugna", primaryAttribute: "intelligence", damageType: "magical", tags: ["healing"], roles: ["carry"] },
  { id: "queen_of_pain", shortName: "queenofpain", name: "Queen of Pain", primaryAttribute: "universal", damageType: "magical", tags: ["burst"], roles: ["carry"] },
  { id: "ringmaster", shortName: "ringmaster", name: "Ringmaster", primaryAttribute: "intelligence", damageType: "magical", tags: ["silences"], roles: ["support"] },
  { id: "rubick", shortName: "rubick", name: "Rubick", primaryAttribute: "universal", damageType: "magical", tags: [], roles: ["support"] },
  { id: "shadow_demon", shortName: "shadow_demon", name: "Shadow Demon", primaryAttribute: "universal", damageType: "magical", tags: ["silences"], roles: ["support"] },
  { id: "shadow_shaman", shortName: "shadow_shaman", name: "Shadow Shaman", primaryAttribute: "intelligence", damageType: "magical", tags: ["stuns", "split"], roles: ["support"] },
  { id: "silencer", shortName: "silencer", name: "Silencer", primaryAttribute: "universal", damageType: "magical", tags: ["silences"], roles: ["support"] },
  { id: "skywrath", shortName: "skywrath_mage", name: "Skywrath Mage", primaryAttribute: "intelligence", damageType: "magical", tags: ["silences", "burst"], roles: ["support"] },
  { id: "storm_spirit", shortName: "storm_spirit", name: "Storm Spirit", primaryAttribute: "universal", damageType: "magical", tags: ["burst", "stuns"], roles: ["carry"] },
  { id: "techies", shortName: "techies", name: "Techies", primaryAttribute: "universal", damageType: "magical", tags: ["burst"], roles: ["support"] },
  { id: "tinker", shortName: "tinker", name: "Tinker", primaryAttribute: "universal", damageType: "magical", tags: ["burst", "split"], roles: ["carry"] },
  { id: "venomancer", shortName: "venomancer", name: "Venomancer", primaryAttribute: "universal", damageType: "magical", tags: [], roles: ["support"] },
  { id: "warlock", shortName: "warlock", name: "Warlock", primaryAttribute: "universal", damageType: "magical", tags: ["healing", "engage"], roles: ["support", "initiator"] },
  { id: "winter_wyvern", shortName: "winter_wyvern", name: "Winter Wyvern", primaryAttribute: "intelligence", damageType: "magical", tags: ["healing"], roles: ["support"] },
  { id: "witch_doctor", shortName: "witch_doctor", name: "Witch Doctor", primaryAttribute: "intelligence", damageType: "magical", tags: ["stuns"], roles: ["support"] },
  { id: "zeus", shortName: "zuus", name: "Zeus", primaryAttribute: "intelligence", damageType: "magical", tags: ["burst"], roles: ["carry"] },

  // Universal (newer / reclassified)
  { id: "brewmaster", shortName: "brewmaster", name: "Brewmaster", primaryAttribute: "universal", damageType: "physical", tags: ["stuns", "engage"], roles: ["initiator"] },
  { id: "earth_spirit", shortName: "earth_spirit", name: "Earth Spirit", primaryAttribute: "universal", damageType: "magical", tags: ["silences", "stuns", "engage"], roles: ["initiator", "support"] },
  { id: "io", shortName: "wisp", name: "Io", primaryAttribute: "universal", damageType: "magical", tags: ["healing"], roles: ["support"] },
  { id: "kez", shortName: "kez", name: "Kez", primaryAttribute: "agility", damageType: "physical", tags: ["carry", "burst"], roles: ["carry"] },
  { id: "magnus", shortName: "magnataur", name: "Magnus", primaryAttribute: "universal", damageType: "physical", tags: ["stuns", "engage"], roles: ["initiator"] },
  { id: "marci", shortName: "marci", name: "Marci", primaryAttribute: "universal", damageType: "physical", tags: ["stuns", "healing", "engage"], roles: ["support", "carry"] },
  { id: "mirana", shortName: "mirana", name: "Mirana", primaryAttribute: "universal", damageType: "physical", tags: ["stuns"], roles: ["support", "carry"] },
  { id: "nature_prophet", shortName: "furion", name: "Nature's Prophet", primaryAttribute: "universal", damageType: "physical", tags: ["split"], roles: ["carry", "support"] },
  { id: "pangolier", shortName: "pangolier", name: "Pangolier", primaryAttribute: "universal", damageType: "physical", tags: ["silences", "engage"], roles: ["initiator"] },
  { id: "snapfire", shortName: "snapfire", name: "Snapfire", primaryAttribute: "universal", damageType: "magical", tags: ["stuns"], roles: ["support"] },
  { id: "vengeful_spirit", shortName: "vengefulspirit", name: "Vengeful Spirit", primaryAttribute: "universal", damageType: "physical", tags: ["stuns"], roles: ["support"] },
  { id: "visage", shortName: "visage", name: "Visage", primaryAttribute: "universal", damageType: "physical", tags: ["split"], roles: ["carry"] },
  { id: "void_spirit", shortName: "void_spirit", name: "Void Spirit", primaryAttribute: "universal", damageType: "magical", tags: ["burst", "stuns"], roles: ["carry"] },
  { id: "windranger", shortName: "windrunner", name: "Windranger", primaryAttribute: "universal", damageType: "physical", tags: ["silences", "burst"], roles: ["carry", "support"] },
];

const byShort = new Map(H.map((h) => [h.shortName, h]));
const byId = new Map(H.map((h) => [h.id, h]));

export function getHeroMeta(key: string): DotaHeroMeta | undefined {
  return byShort.get(key) ?? byId.get(key);
}

export const ALL_DOTA_HEROES = H;
