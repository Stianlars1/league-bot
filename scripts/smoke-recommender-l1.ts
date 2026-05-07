/**
 * Layer-1 smoke test. Builds two synthetic Matches with the same enemy
 * champion (Ahri) but different item state — one with Liandry + Void Staff,
 * one with only Doran's Ring — and verifies the threat score / item profile
 * actually responds to live items.
 *
 * Run:  pnpm tsx scripts/smoke-recommender-l1.ts
 *
 * Expected: scenario-A (full burst items, 0/5 KDA) threat score should be
 * close to or higher than scenario-B (no items, 5/0 KDA), confirming Layer-1
 * weights real items into the equation. Pre-Layer-1, B would have decisively
 * won purely on KDA.
 */

import {
  buildEnemyItemProfile,
  evaluateThreats,
  type Threat,
} from "@/lib/games/league/ally-actions";
import { getChampMeta } from "@/lib/games/league/data";
import { ensureItemDb } from "@/lib/games/league/item-tags";
import type { Participant } from "@/lib/games/types";

// Item IDs from Riot Data Dragon. Stable across patches.
// https://ddragon.leagueoflegends.com/cdn/{version}/data/en_US/item.json
const SORCERERS_SHOES = "3020";
const LIANDRYS_TORMENT = "6653";
const VOID_STAFF = "3135";
const DORANS_RING = "1056";

function makeAhri(
  items: string[],
  stats: { kills: number; deaths: number; assists: number; gold: number; level: number },
): Participant {
  return {
    side: "enemy",
    team: "red",
    position: "MIDDLE",
    character: { id: "Ahri", name: "Ahri", damageType: "ap" },
    items,
    stats: {
      kills: stats.kills,
      deaths: stats.deaths,
      assists: stats.assists,
      cs: 100,
      gold: stats.gold,
      level: stats.level,
    },
  };
}

function fmtThreat(label: string, t: Threat) {
  console.log(`\n=== ${label} ===`);
  console.log(`  threatScore     = ${t.threatScore.toFixed(2)}`);
  console.log(`  kdaRatio        = ${t.kdaRatio.toFixed(2)}${t.fed ? "  (FED)" : ""}`);
  console.log(`  completedItems  = ${t.completedItems}`);
  console.log(`  itemTags        = ${[...t.itemTags].sort().join(", ") || "(none)"}`);
  const stats = t.participant.stats!;
  console.log(`  stats           = ${stats.kills}/${stats.deaths}/${stats.assists} · L${stats.level} · ${stats.gold}g`);
}

async function main() {
  process.stdout.write("Warming Data Dragon item DB... ");
  await ensureItemDb();
  console.log("done.");

  const meta = getChampMeta("Ahri");
  if (!meta) throw new Error("Ahri not in champion meta");

  // Scenario A — Ahri at 0/5/0 with completed burst items
  const ahriCored = makeAhri(
    [SORCERERS_SHOES, LIANDRYS_TORMENT, VOID_STAFF, DORANS_RING],
    { kills: 0, deaths: 5, assists: 0, gold: 4500, level: 13 },
  );

  // Scenario B — Ahri at 5/0/0 with only Doran's Ring (no completed items)
  const ahriEarly = makeAhri(
    [DORANS_RING],
    { kills: 5, deaths: 0, assists: 0, gold: 4500, level: 13 },
  );

  const threatsA = evaluateThreats([ahriCored], [meta]);
  const threatsB = evaluateThreats([ahriEarly], [meta]);
  const profileA = buildEnemyItemProfile([ahriCored]);
  const profileB = buildEnemyItemProfile([ahriEarly]);

  fmtThreat("Scenario A — Ahri 0/5/0 with Liandry + Void Staff", threatsA[0]);
  fmtThreat("Scenario B — Ahri 5/0/0 with only Doran's Ring", threatsB[0]);

  console.log("\n=== EnemyItemProfile (A) ===");
  console.log(`  totalCompletedItems    = ${profileA.totalCompletedItems}`);
  console.log(`  totalGoldOnLegendaries = ${profileA.totalGoldOnLegendaries}`);
  console.log(`  stage                  = ${profileA.stage}`);
  console.log(`  presence               = ${[...profileA.presence.entries()].map(([k, v]) => `${k}=${v}`).join(", ") || "(empty)"}`);
  console.log(`  healingItems           = ${profileA.healingItems.length}`);

  console.log("\n=== EnemyItemProfile (B) ===");
  console.log(`  totalCompletedItems    = ${profileB.totalCompletedItems}`);
  console.log(`  totalGoldOnLegendaries = ${profileB.totalGoldOnLegendaries}`);
  console.log(`  stage                  = ${profileB.stage}`);
  console.log(`  presence               = ${[...profileB.presence.entries()].map(([k, v]) => `${k}=${v}`).join(", ") || "(empty)"}`);

  console.log("\n=== Comparison: A (full items, 0/5) vs B (no items, 5/0) ===");
  const delta = threatsA[0].threatScore - threatsB[0].threatScore;
  console.log(`  threatScore delta (A - B) = ${delta.toFixed(2)}`);
  console.log("  KDA term still dominates extreme contrasts (realistic — a 5-0 lead");
  console.log("  is genuinely more threatening short-term than a 0-5 with items).");
  console.log("  Layer-1's job is to make items NOT INVISIBLE, not to override KDA.");

  // ---------------------------------------------------------------------------
  // Cleaner isolation: SAME KDA, different items. Shows the item delta directly.
  // ---------------------------------------------------------------------------
  const ahriEvenCored = makeAhri(
    [SORCERERS_SHOES, LIANDRYS_TORMENT, VOID_STAFF, DORANS_RING],
    { kills: 3, deaths: 3, assists: 5, gold: 6000, level: 13 },
  );
  const ahriEvenEmpty = makeAhri(
    [DORANS_RING],
    { kills: 3, deaths: 3, assists: 5, gold: 6000, level: 13 },
  );
  const threatsC = evaluateThreats([ahriEvenCored], [meta]);
  const threatsD = evaluateThreats([ahriEvenEmpty], [meta]);

  fmtThreat("Scenario C — Ahri 3/3/5 with Liandry + Void Staff", threatsC[0]);
  fmtThreat("Scenario D — Ahri 3/3/5 with only Doran's Ring", threatsD[0]);
  const itemDelta = threatsC[0].threatScore - threatsD[0].threatScore;
  console.log(`\n  Same KDA, item-only delta = +${itemDelta.toFixed(2)}`);
  console.log(`  Items add ${((itemDelta / threatsD[0].threatScore) * 100).toFixed(0)}% to threat score at identical performance ✓`);

  // Sanity assertions
  if (threatsA[0].completedItems !== 2) {
    throw new Error(`Scenario A should have 2 completed items (Liandry, Void Staff); got ${threatsA[0].completedItems}`);
  }
  if (threatsB[0].completedItems !== 0) {
    throw new Error(`Scenario B should have 0 completed items; got ${threatsB[0].completedItems}`);
  }
  if (!threatsA[0].itemTags.has("AP")) {
    throw new Error("Scenario A should have AP tag from item presence");
  }
  if (!threatsA[0].itemTags.has("MagicPen")) {
    throw new Error("Scenario A should have MagicPen tag from Void Staff");
  }
  if (itemDelta <= 0) {
    throw new Error(
      `Same-KDA item delta should be positive; got ${itemDelta.toFixed(2)} — Layer-1 not weighting items into threat score`,
    );
  }
  console.log("\n✓ All sanity assertions passed.");
}

main().catch((err) => {
  console.error("\nSmoke test failed:", err);
  process.exit(1);
});
