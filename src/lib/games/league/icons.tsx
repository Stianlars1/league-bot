import type { GameIcons } from "../icons";

const DDRAGON_VERSION = "14.24.1";
const DDRAGON_ITEM = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/item`;

/**
 * Map item display names → Riot's numeric item IDs.
 * Sourced from Data Dragon item.json. Covers the items the recommender
 * actually emits + a handful of common substitutes.
 */
const ITEM_ID: Record<string, number> = {
  // Boots
  "Mercury's Treads": 3111,
  "Plated Steelcaps": 3047,
  "Berserker's Greaves": 3006,
  "Sorcerer's Shoes": 3020,
  "Ionian Boots of Lucidity": 3158,
  "Boots of Swiftness": 3009,
  "Boots": 1001,

  // Magic resist
  "Hexdrinker": 3155,
  "Maw of Malmortius": 3156,
  "Banshee's Veil": 3102,
  "Wit's End": 3091,
  "Force of Nature": 4401,
  "Spirit Visage": 3065,
  "Edge of Night": 3814,

  // Armor
  "Frozen Heart": 3110,
  "Randuin's Omen": 3143,
  "Thornmail": 3075,
  "Bramble Vest": 3076,
  "Dead Man's Plate": 3742,
  "Sunfire Aegis": 3068,

  // Bruiser / fighter
  "Sterak's Gage": 3053,
  "Death's Dance": 6333,
  "Black Cleaver": 3071,
  "Trinity Force": 3078,
  "Goredrinker": 6630, // also Stridebreaker
  "Stridebreaker": 6631,

  // Tank dmg
  "Liandry's Anguish": 6653,
  "Demonic Embrace": 4637,
  "Blade of the Ruined King": 3153,
  "Blade of the Ruined King (BotRK)": 3153,
  "BotRK": 3153,

  // Anti-heal
  "Mortal Reminder": 3033,
  "Lord Dominik's Regards": 3036,
  "Lord Dominik's": 3036,
  "Morellonomicon": 3165,
  "Chempunk Chainsword": 6609,
  "Chempunk": 6609,
  "Executioner's Calling": 3123,
  "Chemtech Putrifier": 3011,

  // Carry — physical
  "Infinity Edge": 3031,
  "IE": 3031,
  "Bloodthirster": 3072,
  "Phantom Dancer": 3046,
  "Stormrazor": 3095, // legacy
  "The Collector": 6676,
  "Lord Dominik's (LDR)": 3036,

  // Carry — magic
  "Rabadon's Deathcap": 3089,
  "Rabadon's": 3089,
  "Void Staff": 3135,
  "Shadowflame": 4645,
  "Zhonya's Hourglass": 3157,
  "Stopwatch": 2420,
  "Cosmic Drive": 4629,
  "Luden's Companion": 6655,

  // Defensive
  "Guardian Angel": 3026,
  "GA": 3026,
  "Mercurial Scimitar": 3139,
  "Mercurial Scimitar (QSS)": 3139,
  "Quicksilver Sash": 3140,
  "QSS": 3140,
  "Aeon Disk": 0, // not in current League — placeholder

  // Lethality
  "Eclipse": 6692,
  "Hubris": 6697,
  "Serylda's Grudge": 6694,
  "Axiom Arc": 6696,
  "Serpent's Fang": 6695,

  // Support
  "Mikael's Blessing": 3222,
  "Locket of the Iron Solari": 3190,
  "Locket": 3190,
  "Vigilant Wardstone": 4643,
  "Knight's Vow": 3109,
  "Redemption": 3107,
  "Ardent Censer": 3504,
  "Shurelya's Battlesong": 2065,

  // Jungle pets
  "Mosstomper": 1413,
  "Gustwalker": 1411,
  "Scorchclaw": 1410,
  "Mosstomper / Gustwalker (early ganks)": 1413,
};

function lookupItemId(name: string): number | null {
  if (ITEM_ID[name] !== undefined) return ITEM_ID[name] || null;
  // Try fuzzy: split arrows and "/"
  const cleaned = name
    .replace(/\s*→.*/, "")
    .replace(/\s*\/.*/, "")
    .replace(/\s*\(.*\)/g, "")
    .trim();
  if (ITEM_ID[cleaned] !== undefined) return ITEM_ID[cleaned] || null;
  return null;
}

function itemUrl(name: string): string | null {
  const id = lookupItemId(name);
  if (!id) return null;
  return `${DDRAGON_ITEM}/${id}.png`;
}

/* ---------- Inline SVG icons (Riot visual language) ---------- */

function PositionIcon({ position }: { position: string }) {
  // Stylized lane indicators inspired by Riot's Pinpoint glyphs
  const COMMON = (
    <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="1.4" opacity="0.4" />
  );
  switch (position) {
    case "TOP":
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Top lane">
          {COMMON}
          <path d="M5 5 L5 12 L12 5 Z M5 5 L19 5" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "JUNGLE":
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Jungle">
          {COMMON}
          <path d="M12 3 L7 9 L9.5 9 L7 14 L10 14 L8 19 L12 21 L16 19 L14 14 L17 14 L14.5 9 L17 9 Z" fill="currentColor" />
        </svg>
      );
    case "MIDDLE":
    case "MID":
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Middle">
          {COMMON}
          <path d="M5 19 L19 5 M5 5 L19 19" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          <circle cx="12" cy="12" r="2.5" fill="currentColor" />
        </svg>
      );
    case "BOTTOM":
    case "BOT":
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Bottom lane">
          {COMMON}
          <path d="M19 19 L19 12 L12 19 Z M19 19 L5 19" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </svg>
      );
    case "UTILITY":
    case "SUPPORT":
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Support">
          {COMMON}
          <path d="M12 19 C 7 16 4 13 4 9 C 4 6 6.5 4 9 4 C 10.5 4 12 5 12 6.5 C 12 5 13.5 4 15 4 C 17.5 4 20 6 20 9 C 20 13 17 16 12 19 Z" fill="currentColor" />
        </svg>
      );
    default:
      return null;
  }
}

function ObjectiveIcon({
  kind,
}: {
  kind: "drake" | "elder" | "herald" | "baron" | "tower" | "inhibitor";
}) {
  switch (kind) {
    case "drake":
      // Dragon silhouette
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Drake">
          <path d="M3 12 C 5 8 9 6 12 6 C 15 6 19 8 21 12 C 19 14 16 15 14 14 L 12 16 L 10 14 C 8 15 5 14 3 12 Z M 12 6 L 12 3 M 9 8 L 7 4 M 15 8 L 17 4" fill="currentColor" stroke="currentColor" strokeWidth="0.8" />
          <circle cx="9" cy="11" r="1" fill="hsl(var(--background))" />
          <circle cx="15" cy="11" r="1" fill="hsl(var(--background))" />
        </svg>
      );
    case "elder":
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Elder Dragon">
          <path d="M2 12 L6 8 L10 11 L12 4 L14 11 L18 8 L22 12 L18 14 L14 13 L12 17 L10 13 L6 14 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.6" />
        </svg>
      );
    case "herald":
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Rift Herald">
          <path d="M12 3 L17 7 L17 12 C17 16 14 20 12 21 C10 20 7 16 7 12 L7 7 Z" fill="currentColor" />
          <circle cx="10.5" cy="11" r="1.2" fill="hsl(var(--background))" />
          <circle cx="13.5" cy="11" r="1.2" fill="hsl(var(--background))" />
          <path d="M9 15 L15 15" stroke="hsl(var(--background))" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      );
    case "baron":
      return (
        <svg viewBox="0 0 24 24" width="16" height="16" aria-label="Baron Nashor">
          <path d="M12 2 L15 5 L18 4 L17 8 L21 10 L17 12 L20 16 L15 16 L13 21 L11 21 L9 16 L4 16 L7 12 L3 10 L7 8 L6 4 L9 5 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.6" strokeLinejoin="round" />
        </svg>
      );
    case "tower":
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Tower">
          <path d="M9 21 L9 16 L7 14 L7 8 L9 6 L9 3 L15 3 L15 6 L17 8 L17 14 L15 16 L15 21 Z" fill="currentColor" />
          <rect x="10.5" y="9" width="3" height="3" fill="hsl(var(--background))" />
        </svg>
      );
    case "inhibitor":
      return (
        <svg viewBox="0 0 24 24" width="14" height="14" aria-label="Inhibitor">
          <path d="M12 3 L18 8 L18 16 L12 21 L6 16 L6 8 Z" fill="currentColor" stroke="currentColor" strokeWidth="0.6" />
          <circle cx="12" cy="12" r="3" fill="hsl(var(--background))" />
        </svg>
      );
  }
}

export const leagueIcons: GameIcons = {
  itemIcon(name) {
    return itemUrl(name);
  },
  positionIcon(position) {
    if (!position) return null;
    return <PositionIcon position={position} />;
  },
  objectiveIcon(kind) {
    return <ObjectiveIcon kind={kind} />;
  },
};
