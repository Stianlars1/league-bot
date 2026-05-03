import { log } from "./log";
import { ingestFrame, type IngestPayload } from "./relay";

const LIVE_CLIENT_URL = "https://127.0.0.1:2999/liveclientdata/allgamedata";
const POLL_INTERVAL_MS = 1000;

interface AllGameData {
  gameData?: { gameTime?: number };
  allPlayers?: unknown[];
}

export interface PollTickInfo {
  status: "no-game" | "idle" | "pushed" | "push-failed";
  gameTime?: number;
  playerCount?: number;
  pushedAt?: number;
}

export interface PollState {
  token: string;
  onTick?: (info: PollTickInfo) => void;
}

let pollHandle: ReturnType<typeof setInterval> | null = null;
let lastPushedTick = -1;

async function fetchLiveClient(): Promise<AllGameData | null> {
  try {
    const res = await fetch(LIVE_CLIENT_URL, {
      signal: AbortSignal.timeout(2000),
    });
    if (!res.ok) return null;
    return (await res.json()) as AllGameData;
  } catch {
    return null;
  }
}

async function tick(state: PollState): Promise<void> {
  const data = await fetchLiveClient();
  if (!data) {
    state.onTick?.({ status: "no-game" });
    return;
  }
  const gameTime = data.gameData?.gameTime ?? 0;
  const intTick = Math.floor(gameTime);
  if (intTick === lastPushedTick) {
    state.onTick?.({
      status: "idle",
      gameTime,
      playerCount: data.allPlayers?.length,
    });
    return;
  }
  lastPushedTick = intTick;
  const payload: IngestPayload = {
    capturedAt: Date.now(),
    gameId: "league",
    source: "live-client",
    payload: data,
  };
  const ok = await ingestFrame(state.token, payload);
  state.onTick?.({
    status: ok ? "pushed" : "push-failed",
    gameTime,
    playerCount: data.allPlayers?.length,
    pushedAt: ok ? Date.now() : undefined,
  });
}

export function startPoll(state: PollState): void {
  stopPoll();
  lastPushedTick = -1;
  log("poll starting");
  void tick(state);
  pollHandle = setInterval(() => {
    void tick(state);
  }, POLL_INTERVAL_MS);
}

export function stopPoll(): void {
  if (pollHandle !== null) {
    clearInterval(pollHandle);
    pollHandle = null;
    log("poll stopped");
  }
}

export function isPolling(): boolean {
  return pollHandle !== null;
}
