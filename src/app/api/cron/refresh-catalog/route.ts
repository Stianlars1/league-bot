import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db, schema } from "@/lib/db/client";
import { getAllAdapters } from "@/lib/games/registry";
import type { GameId } from "@/lib/games/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Refreshes static character data (champions, heroes) once a day.
 * Authenticated via CRON_SECRET so randoms can't trigger expensive upstream calls.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") ?? "";
  if (secret && auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const summary: Record<string, number | string> = {};

  for (const adapter of getAllAdapters()) {
    try {
      const characters = await adapter.getCharacterCatalog();
      const rows = characters.map((c) => ({
        gameId: adapter.gameId as GameId,
        characterId: c.id,
        name: c.name,
        imageUrl: c.imageUrl ?? null,
        tags: c.tags ?? null,
        damageType: c.damageType ?? null,
        archetype: c.archetype ?? null,
        raw: { id: c.id, shortName: c.id } as never,
        version: null,
        updatedAt: new Date(),
      }));

      // Upsert in batches with per-row `excluded` references so each row
      // updates from its own incoming values.
      const BATCH = 50;
      let inserted = 0;
      for (let i = 0; i < rows.length; i += BATCH) {
        const slice = rows.slice(i, i + BATCH);
        await db()
          .insert(schema.characters)
          .values(slice)
          .onConflictDoUpdate({
            target: [schema.characters.gameId, schema.characters.characterId],
            set: {
              name: sql`excluded.name`,
              imageUrl: sql`excluded.image_url`,
              tags: sql`excluded.tags`,
              damageType: sql`excluded.damage_type`,
              archetype: sql`excluded.archetype`,
              raw: sql`excluded.raw`,
              version: sql`excluded.version`,
              updatedAt: sql`excluded.updated_at`,
            },
          });
        inserted += slice.length;
      }

      summary[adapter.gameId] = inserted;
    } catch (err) {
      summary[adapter.gameId] = err instanceof Error ? err.message : "failed";
    }
  }

  return NextResponse.json({ ok: true, summary, ranAt: new Date().toISOString() });
}
