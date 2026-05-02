import type { ReactNode } from "react";

/**
 * Per-game icon registry. Each game owns the visual language of its own
 * objectives, items, and roles — we don't reach for generic icon libs.
 *
 * League: items pulled from Data Dragon (Riot's official CDN), roles and
 * objectives drawn as inline SVGs in Riot's visual language.
 *
 * Dota: stub for now — when Stratz live data is wired up we'll plug
 * Steam CDN image URLs and Valve-style ability iconography.
 */
export interface GameIcons {
  itemIcon(name: string): string | null;
  positionIcon(position: string | undefined): ReactNode;
  objectiveIcon(
    kind: "drake" | "elder" | "herald" | "baron" | "tower" | "inhibitor",
  ): ReactNode;
}
