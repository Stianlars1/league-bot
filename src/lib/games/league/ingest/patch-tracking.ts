/**
 * Patch detection for layer-3 ingest. Riot's Data Dragon
 * `versions.json` is authoritative — the first entry is the current
 * patch. Match-V5 results include their patch in `gameVersion`, so
 * post-fetch we cross-check that the match was played on the patch
 * we expect.
 *
 * STATUS: Scaffolded. Used only when ingest cron fires (flag-gated).
 */

import { latestVersion } from "../data-dragon";

/** Truncate a Data Dragon version string ("14.24.1") to the major.minor
 *  patch identifier used by Match-V5 (`gameVersion: "14.24..."`). */
export function toPatchId(version: string): string {
  const parts = version.split(".");
  if (parts.length < 2) return version;
  return `${parts[0]}.${parts[1]}`;
}

/** Active patch ID (e.g., "14.24"). Reads Data Dragon. */
export async function currentPatch(): Promise<string> {
  return toPatchId(await latestVersion());
}

/** True when a Match-V5 `gameVersion` matches our active patch. */
export function isCurrentPatch(matchGameVersion: string, currentPatchId: string): boolean {
  return toPatchId(matchGameVersion) === currentPatchId;
}
