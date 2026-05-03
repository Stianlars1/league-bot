// Persistence for the small bit of runtime state that needs to survive a
// Chrome service-worker restart. The SW + its offscreen document are torn
// down after ~30s of inactivity; without this, every wake-up resets the
// "Pushed" counter to 0 and the popup briefly shows blank stats.
//
// We only persist on actual push events (sparse writes), not on every poll.
// `frameCount` is a noisy diagnostic that nobody sees in the UI, so it's
// allowed to reset on restart — only the user-visible numbers persist.

import { getItem, setItem } from "./storage";
import type { PollTickInfo } from "./poll";

const KEY = "runtimeState";

export interface RuntimeState {
  pushedCount: number;
  lastPush: PollTickInfo | null;
}

const EMPTY: RuntimeState = { pushedCount: 0, lastPush: null };

export async function loadRuntimeState(): Promise<RuntimeState> {
  const stored = await getItem<RuntimeState>(KEY);
  if (!stored) return EMPTY;
  return {
    pushedCount: typeof stored.pushedCount === "number" ? stored.pushedCount : 0,
    lastPush: stored.lastPush ?? null,
  };
}

export async function saveRuntimeState(state: RuntimeState): Promise<void> {
  await setItem(KEY, state);
}

export async function clearRuntimeState(): Promise<void> {
  await setItem(KEY, EMPTY);
}
