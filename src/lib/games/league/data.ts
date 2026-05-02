/**
 * Hand-curated archetype/damage data for League's most-played champions.
 * Used by the recommender even when Data Dragon hasn't seeded the DB yet,
 * so the app works the first time you run it. Extend as needed.
 *
 * Damage type rationale:
 *   - "ad"  → mostly physical. Building Armor counters this.
 *   - "ap"  → mostly magic. Building Magic Resist counters this.
 *   - "hybrid" → mixed; harder to itemize against.
 *
 * Tags (open set):
 *   "healing"   — strong self/team healing → Grievous Wounds
 *   "shielding" — shields → Serpent's Fang / antiheal
 *   "engage"    — hard engage threat → Zhonya / disengage
 *   "burst"     — assassin/dive → Stopwatch / GA / armor
 *   "poke"      — long range chip → sustain / shields
 *   "tank"      — frontline → %HP damage / armor pen
 *   "cc"        — heavy CC → Mercury / QSS
 *   "split"     — splitpush threat → wave management
 *   "scaling"   — late game champion → end the game early
 */

export interface LeagueChampMeta {
  id: string; // matches Riot championName from Spectator-v5
  damageType: "ad" | "ap" | "hybrid";
  archetype: "assassin" | "fighter" | "tank" | "mage" | "marksman" | "support" | "skirmisher" | "juggernaut";
  tags: string[];
  position?: ("TOP" | "JUNGLE" | "MIDDLE" | "BOTTOM" | "UTILITY")[];
}

const C: LeagueChampMeta[] = [
  // Top
  { id: "Aatrox", damageType: "ad", archetype: "fighter", tags: ["healing", "engage"], position: ["TOP"] },
  { id: "Camille", damageType: "ad", archetype: "fighter", tags: ["engage", "split"], position: ["TOP"] },
  { id: "Darius", damageType: "ad", archetype: "juggernaut", tags: ["healing", "tank"], position: ["TOP"] },
  { id: "Fiora", damageType: "ad", archetype: "skirmisher", tags: ["split", "burst"], position: ["TOP"] },
  { id: "Garen", damageType: "ad", archetype: "juggernaut", tags: ["tank"], position: ["TOP"] },
  { id: "Gwen", damageType: "ap", archetype: "skirmisher", tags: ["split", "scaling"], position: ["TOP"] },
  { id: "Irelia", damageType: "ad", archetype: "skirmisher", tags: ["cc", "split"], position: ["TOP", "MIDDLE"] },
  { id: "Jax", damageType: "hybrid", archetype: "skirmisher", tags: ["scaling", "split"], position: ["TOP"] },
  { id: "Jayce", damageType: "ad", archetype: "fighter", tags: ["poke"], position: ["TOP"] },
  { id: "KSante", damageType: "ad", archetype: "tank", tags: ["tank", "engage"], position: ["TOP"] },
  { id: "Malphite", damageType: "ap", archetype: "tank", tags: ["tank", "engage", "cc"], position: ["TOP"] },
  { id: "Mordekaiser", damageType: "ap", archetype: "juggernaut", tags: ["scaling"], position: ["TOP"] },
  { id: "Olaf", damageType: "ad", archetype: "juggernaut", tags: ["healing", "engage"], position: ["TOP", "JUNGLE"] },
  { id: "Ornn", damageType: "ap", archetype: "tank", tags: ["tank", "cc"], position: ["TOP"] },
  { id: "Renekton", damageType: "ad", archetype: "fighter", tags: ["engage"], position: ["TOP"] },
  { id: "Riven", damageType: "ad", archetype: "fighter", tags: ["burst", "engage"], position: ["TOP"] },
  { id: "Sett", damageType: "ad", archetype: "juggernaut", tags: ["engage", "tank"], position: ["TOP"] },
  { id: "Shen", damageType: "ad", archetype: "tank", tags: ["tank", "shielding", "split"], position: ["TOP"] },
  { id: "Sion", damageType: "ad", archetype: "tank", tags: ["tank", "engage", "cc"], position: ["TOP"] },
  { id: "Yorick", damageType: "ad", archetype: "juggernaut", tags: ["split", "scaling"], position: ["TOP"] },

  // Jungle
  { id: "Bel'Veth", damageType: "ad", archetype: "skirmisher", tags: ["scaling"], position: ["JUNGLE"] },
  { id: "Diana", damageType: "ap", archetype: "assassin", tags: ["burst", "engage"], position: ["JUNGLE", "MIDDLE"] },
  { id: "Elise", damageType: "ap", archetype: "assassin", tags: ["burst"], position: ["JUNGLE"] },
  { id: "Evelynn", damageType: "ap", archetype: "assassin", tags: ["burst"], position: ["JUNGLE"] },
  { id: "Graves", damageType: "ad", archetype: "marksman", tags: ["burst"], position: ["JUNGLE"] },
  { id: "Hecarim", damageType: "ad", archetype: "fighter", tags: ["engage"], position: ["JUNGLE"] },
  { id: "Ivern", damageType: "ap", archetype: "support", tags: ["shielding"], position: ["JUNGLE"] },
  { id: "Karthus", damageType: "ap", archetype: "mage", tags: ["scaling"], position: ["JUNGLE"] },
  { id: "Kayn", damageType: "ad", archetype: "skirmisher", tags: ["burst", "engage"], position: ["JUNGLE"] },
  { id: "Kindred", damageType: "ad", archetype: "marksman", tags: ["scaling"], position: ["JUNGLE"] },
  { id: "LeeSin", damageType: "ad", archetype: "fighter", tags: ["engage"], position: ["JUNGLE"] },
  { id: "MasterYi", damageType: "ad", archetype: "skirmisher", tags: ["scaling", "burst"], position: ["JUNGLE"] },
  { id: "Nidalee", damageType: "ap", archetype: "assassin", tags: ["poke"], position: ["JUNGLE"] },
  { id: "Nocturne", damageType: "ad", archetype: "assassin", tags: ["engage"], position: ["JUNGLE"] },
  { id: "RekSai", damageType: "ad", archetype: "fighter", tags: ["engage"], position: ["JUNGLE"] },
  { id: "Sejuani", damageType: "ap", archetype: "tank", tags: ["tank", "engage", "cc"], position: ["JUNGLE"] },
  { id: "Vi", damageType: "ad", archetype: "fighter", tags: ["engage", "cc"], position: ["JUNGLE"] },
  { id: "Viego", damageType: "ad", archetype: "skirmisher", tags: ["scaling"], position: ["JUNGLE"] },
  { id: "Warwick", damageType: "hybrid", archetype: "juggernaut", tags: ["healing", "engage"], position: ["JUNGLE"] },
  { id: "Zac", damageType: "ap", archetype: "tank", tags: ["tank", "engage", "cc"], position: ["JUNGLE"] },

  // Mid
  { id: "Ahri", damageType: "ap", archetype: "mage", tags: ["burst"], position: ["MIDDLE"] },
  { id: "Akali", damageType: "ap", archetype: "assassin", tags: ["burst"], position: ["MIDDLE"] },
  { id: "Annie", damageType: "ap", archetype: "mage", tags: ["burst", "cc"], position: ["MIDDLE"] },
  { id: "Azir", damageType: "ap", archetype: "mage", tags: ["scaling", "poke"], position: ["MIDDLE"] },
  { id: "Cassiopeia", damageType: "ap", archetype: "mage", tags: ["scaling"], position: ["MIDDLE"] },
  { id: "Ekko", damageType: "ap", archetype: "assassin", tags: ["burst", "engage"], position: ["MIDDLE", "JUNGLE"] },
  { id: "Fizz", damageType: "ap", archetype: "assassin", tags: ["burst"], position: ["MIDDLE"] },
  { id: "Galio", damageType: "ap", archetype: "tank", tags: ["tank", "engage", "cc"], position: ["MIDDLE"] },
  { id: "Kassadin", damageType: "ap", archetype: "assassin", tags: ["scaling", "burst"], position: ["MIDDLE"] },
  { id: "Katarina", damageType: "ap", archetype: "assassin", tags: ["burst"], position: ["MIDDLE"] },
  { id: "LeBlanc", damageType: "ap", archetype: "assassin", tags: ["burst"], position: ["MIDDLE"] },
  { id: "Lux", damageType: "ap", archetype: "mage", tags: ["poke", "cc"], position: ["MIDDLE", "UTILITY"] },
  { id: "Orianna", damageType: "ap", archetype: "mage", tags: ["engage", "scaling"], position: ["MIDDLE"] },
  { id: "Sylas", damageType: "ap", archetype: "skirmisher", tags: ["healing", "engage"], position: ["MIDDLE"] },
  { id: "Syndra", damageType: "ap", archetype: "mage", tags: ["burst", "scaling"], position: ["MIDDLE"] },
  { id: "TwistedFate", damageType: "ap", archetype: "mage", tags: ["cc"], position: ["MIDDLE"] },
  { id: "Veigar", damageType: "ap", archetype: "mage", tags: ["scaling", "burst"], position: ["MIDDLE"] },
  { id: "Vex", damageType: "ap", archetype: "mage", tags: ["burst", "cc"], position: ["MIDDLE"] },
  { id: "Viktor", damageType: "ap", archetype: "mage", tags: ["scaling", "poke"], position: ["MIDDLE"] },
  { id: "Yasuo", damageType: "ad", archetype: "skirmisher", tags: ["scaling"], position: ["MIDDLE", "TOP"] },
  { id: "Yone", damageType: "ad", archetype: "skirmisher", tags: ["scaling"], position: ["MIDDLE", "TOP"] },
  { id: "Zed", damageType: "ad", archetype: "assassin", tags: ["burst"], position: ["MIDDLE"] },

  // Bot (ADC)
  { id: "Aphelios", damageType: "ad", archetype: "marksman", tags: ["scaling", "poke"], position: ["BOTTOM"] },
  { id: "Ashe", damageType: "ad", archetype: "marksman", tags: ["cc", "poke"], position: ["BOTTOM"] },
  { id: "Caitlyn", damageType: "ad", archetype: "marksman", tags: ["poke"], position: ["BOTTOM"] },
  { id: "Draven", damageType: "ad", archetype: "marksman", tags: ["burst"], position: ["BOTTOM"] },
  { id: "Ezreal", damageType: "hybrid", archetype: "marksman", tags: ["poke"], position: ["BOTTOM"] },
  { id: "Jhin", damageType: "ad", archetype: "marksman", tags: ["burst", "poke"], position: ["BOTTOM"] },
  { id: "Jinx", damageType: "ad", archetype: "marksman", tags: ["scaling"], position: ["BOTTOM"] },
  { id: "Kaisa", damageType: "hybrid", archetype: "marksman", tags: ["scaling", "burst"], position: ["BOTTOM"] },
  { id: "KogMaw", damageType: "hybrid", archetype: "marksman", tags: ["scaling"], position: ["BOTTOM"] },
  { id: "Lucian", damageType: "ad", archetype: "marksman", tags: ["burst"], position: ["BOTTOM"] },
  { id: "MissFortune", damageType: "ad", archetype: "marksman", tags: ["burst"], position: ["BOTTOM"] },
  { id: "Samira", damageType: "ad", archetype: "marksman", tags: ["burst", "engage"], position: ["BOTTOM"] },
  { id: "Senna", damageType: "ad", archetype: "marksman", tags: ["scaling", "poke"], position: ["BOTTOM", "UTILITY"] },
  { id: "Sivir", damageType: "ad", archetype: "marksman", tags: ["scaling"], position: ["BOTTOM"] },
  { id: "Tristana", damageType: "ad", archetype: "marksman", tags: ["burst"], position: ["BOTTOM"] },
  { id: "Twitch", damageType: "ad", archetype: "marksman", tags: ["scaling"], position: ["BOTTOM"] },
  { id: "Varus", damageType: "ad", archetype: "marksman", tags: ["poke"], position: ["BOTTOM"] },
  { id: "Vayne", damageType: "ad", archetype: "marksman", tags: ["scaling"], position: ["BOTTOM"] },
  { id: "Xayah", damageType: "ad", archetype: "marksman", tags: ["scaling"], position: ["BOTTOM"] },
  { id: "Zeri", damageType: "ad", archetype: "marksman", tags: ["scaling"], position: ["BOTTOM"] },

  // Support
  { id: "Alistar", damageType: "ap", archetype: "tank", tags: ["tank", "engage", "cc"], position: ["UTILITY"] },
  { id: "Bard", damageType: "ap", archetype: "support", tags: ["cc"], position: ["UTILITY"] },
  { id: "Blitzcrank", damageType: "ap", archetype: "tank", tags: ["engage", "cc"], position: ["UTILITY"] },
  { id: "Braum", damageType: "ap", archetype: "tank", tags: ["tank", "shielding", "cc"], position: ["UTILITY"] },
  { id: "Janna", damageType: "ap", archetype: "support", tags: ["shielding"], position: ["UTILITY"] },
  { id: "Karma", damageType: "ap", archetype: "support", tags: ["shielding", "poke"], position: ["UTILITY"] },
  { id: "Leona", damageType: "ap", archetype: "tank", tags: ["tank", "engage", "cc"], position: ["UTILITY"] },
  { id: "Lulu", damageType: "ap", archetype: "support", tags: ["shielding", "cc"], position: ["UTILITY"] },
  { id: "Milio", damageType: "ap", archetype: "support", tags: ["shielding"], position: ["UTILITY"] },
  { id: "Nami", damageType: "ap", archetype: "support", tags: ["healing", "cc"], position: ["UTILITY"] },
  { id: "Nautilus", damageType: "ap", archetype: "tank", tags: ["tank", "engage", "cc"], position: ["UTILITY"] },
  { id: "Pyke", damageType: "ad", archetype: "assassin", tags: ["burst", "cc"], position: ["UTILITY"] },
  { id: "Rakan", damageType: "ap", archetype: "support", tags: ["engage", "cc"], position: ["UTILITY"] },
  { id: "Rell", damageType: "ap", archetype: "tank", tags: ["tank", "engage", "cc"], position: ["UTILITY"] },
  { id: "Renata", damageType: "ap", archetype: "support", tags: ["cc"], position: ["UTILITY"] },
  { id: "Seraphine", damageType: "ap", archetype: "support", tags: ["shielding", "cc", "poke"], position: ["UTILITY"] },
  { id: "Sona", damageType: "ap", archetype: "support", tags: ["healing", "shielding"], position: ["UTILITY"] },
  { id: "Soraka", damageType: "ap", archetype: "support", tags: ["healing"], position: ["UTILITY"] },
  { id: "Taric", damageType: "ap", archetype: "support", tags: ["healing", "shielding", "tank"], position: ["UTILITY"] },
  { id: "Thresh", damageType: "ap", archetype: "tank", tags: ["engage", "cc"], position: ["UTILITY"] },
  { id: "Yuumi", damageType: "ap", archetype: "support", tags: ["healing"], position: ["UTILITY"] },
  { id: "Zyra", damageType: "ap", archetype: "mage", tags: ["cc", "poke"], position: ["UTILITY"] },
];

const byId = new Map(C.map((c) => [c.id, c]));

export function getChampMeta(id: string): LeagueChampMeta | undefined {
  return byId.get(id);
}

export const ALL_LEAGUE_CHAMPIONS = C;
