import type { GameIcons } from "../icons";

const STEAM_ITEM = "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/items";

/**
 * Dota item names use Valve's `item_<short_name>` convention. Lookup table
 * will fill in once Stratz live data drives item display. For now, return
 * null and let the UI fall back to text — keeps the abstraction in place.
 */
const ITEM_SHORTNAME: Record<string, string> = {
  "Black King Bar": "black_king_bar",
  "BKB": "black_king_bar",
  "Pipe of Insight": "pipe",
  "Glimmer Cape": "glimmer_cape",
  "Eternal Shroud": "eternal_shroud",
  "Spirit Vessel": "spirit_vessel",
  "Lotus Orb": "lotus_orb",
  "Manta Style": "manta",
  "Linken's Sphere": "sphere",
  "Eul's Scepter": "cyclone",
  "Ghost Scepter": "ghost",
  "Force Staff": "force_staff",
  "Hurricane Pike": "hurricane_pike",
  "Aeon Disk": "aeon_disk",
  "Crimson Guard": "crimson_guard",
  "Solar Crest": "solar_crest",
  "Shiva's Guard": "shivas_guard",
  "Assault Cuirass": "assault",
  "Diffusal Blade": "diffusal_blade",
  "Desolator": "desolator",
  "Bloodthorn": "bloodthorn",
  "Skadi": "skadi",
  "Eye of Skadi": "skadi",
  "Battle Fury": "bfury",
  "Mjolnir": "mjollnir",
  "Maelstrom": "maelstrom",
  "Radiance": "radiance",
  "Monkey King Bar": "monkey_king_bar",
  "MKB": "monkey_king_bar",
};

export const dotaIcons: GameIcons = {
  itemIcon(name) {
    const sn = ITEM_SHORTNAME[name];
    if (!sn) return null;
    return `${STEAM_ITEM}/${sn}.png`;
  },
  positionIcon() {
    return null;
  },
  objectiveIcon() {
    return null;
  },
};
