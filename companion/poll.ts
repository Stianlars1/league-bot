/**
 * Counter Companion — Phase 0 Node poller.
 *
 * Reads Riot's Live Client Data API at 127.0.0.1:2999 on the player's machine
 * and pushes frames to the Counter cloud relay. This is the desktop process
 * that lets the cloud webapp show true realtime data — see docs/companion-app.md.
 *
 * Run from repo root:
 *   pnpm companion:dev                              # uses default https://localhost:3000
 *   COUNTER_HOST=https://counter.app pnpm companion:dev
 *
 * On first run with no stored token, the script prompts for a pairing code
 * (you get one from the web UI). After successful pairing the token is saved
 * to ~/.counter/companion.json and reused on subsequent runs.
 *
 * Phase 0 scope: prove the data path. No Electron, no system tray, no UI.
 * Just a long-running Node process that you start manually while playing.
 */

import { request as httpsRequest } from "node:https";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { homedir } from "node:os";
import { dirname, join } from "node:path";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";

const COUNTER_HOST = process.env.COUNTER_HOST ?? "http://localhost:3000";
const POLL_INTERVAL_MS = Number(process.env.COMPANION_POLL_MS ?? 1000);
const LIVE_CLIENT_URL = "https://127.0.0.1:2999/liveclientdata/allgamedata";
const CONFIG_PATH = join(homedir(), ".counter", "companion.json");

interface CompanionConfig {
  token: string;
  host: string;
  pairedAt: number;
}

interface AllGameData {
  gameData?: { gameMode?: string; gameTime?: number };
  allPlayers?: unknown[];
}

async function readConfig(): Promise<CompanionConfig | null> {
  try {
    const raw = await readFile(CONFIG_PATH, "utf8");
    const parsed = JSON.parse(raw) as CompanionConfig;
    if (!/^[A-Fa-f0-9]{64}$/.test(parsed.token)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function writeConfig(config: CompanionConfig): Promise<void> {
  await mkdir(dirname(CONFIG_PATH), { recursive: true });
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2), { mode: 0o600 });
}

async function pair(): Promise<CompanionConfig> {
  const rl = createInterface({ input, output });
  console.log(`\n  Counter Companion is not paired yet.`);
  console.log(`  1) Open ${COUNTER_HOST}/live in your browser`);
  console.log(`  2) Click "Connect Companion" — you'll get a 6-character code`);
  console.log(`  3) Paste it below (e.g. K3F-9PD)\n`);
  const code = (await rl.question("  Pairing code: ")).trim();
  rl.close();

  const res = await fetch(`${COUNTER_HOST}/api/companion/claim`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ code }),
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(`Pairing failed (HTTP ${res.status}): ${txt.slice(0, 200)}`);
  }
  const { token } = (await res.json()) as { token: string };
  if (!/^[A-Fa-f0-9]{64}$/.test(token)) {
    throw new Error(`Server returned malformed token`);
  }
  const config: CompanionConfig = { token, host: COUNTER_HOST, pairedAt: Date.now() };
  await writeConfig(config);
  console.log(`  ✓ Paired. Token stored at ${CONFIG_PATH}\n`);
  return config;
}

/**
 * Riot's Live Client Data API uses a self-signed cert. We talk to 127.0.0.1
 * so disabling cert verification is acceptable; doing it via node:https.request
 * keeps the scope local instead of polluting the global TLS context.
 */
function fetchLiveClient(): Promise<AllGameData | null> {
  return new Promise((resolve) => {
    const url = new URL(LIVE_CLIENT_URL);
    const req = httpsRequest(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname,
        method: "GET",
        rejectUnauthorized: false,
        timeout: 2000,
      },
      (res) => {
        if (res.statusCode !== 200) {
          res.resume();
          resolve(null);
          return;
        }
        const chunks: Buffer[] = [];
        res.on("data", (c: Buffer) => chunks.push(c));
        res.on("end", () => {
          try {
            resolve(JSON.parse(Buffer.concat(chunks).toString("utf8")) as AllGameData);
          } catch {
            resolve(null);
          }
        });
      },
    );
    req.on("error", () => resolve(null));
    req.on("timeout", () => {
      req.destroy();
      resolve(null);
    });
    req.end();
  });
}

async function pushFrame(config: CompanionConfig, payload: AllGameData): Promise<boolean> {
  const res = await fetch(`${config.host}/api/companion/ingest`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      authorization: `Bearer ${config.token}`,
    },
    body: JSON.stringify({
      capturedAt: Date.now(),
      gameId: "league",
      source: "live-client",
      payload,
    }),
    signal: AbortSignal.timeout(5000),
  });
  return res.ok;
}

function formatGameTime(seconds?: number): string {
  if (typeof seconds !== "number") return "—:—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

async function main() {
  let config = await readConfig();
  if (!config) config = await pair();

  console.log(`  Counter Companion → ${config.host}`);
  console.log(`  Polling https://127.0.0.1:2999 every ${POLL_INTERVAL_MS}ms`);
  console.log(`  Press Ctrl+C to stop.\n`);

  let lastPushedTick = -1;
  let consecutiveMisses = 0;
  let lastStatus = "";

  for (;;) {
    const startedAt = Date.now();
    const data = await fetchLiveClient();
    let status: string;

    if (!data) {
      consecutiveMisses++;
      status = `no game (${consecutiveMisses} misses)`;
    } else {
      consecutiveMisses = 0;
      const gameTime = data.gameData?.gameTime;
      // Only push when game time actually advanced — Riot's clock ticks at ~1Hz
      // so this saves bandwidth without losing fidelity.
      const tick = Math.floor(gameTime ?? 0);
      if (tick !== lastPushedTick) {
        lastPushedTick = tick;
        const ok = await pushFrame(config, data);
        status = ok
          ? `pushed @ ${formatGameTime(gameTime)} (${data.allPlayers?.length ?? 0} players)`
          : `push failed @ ${formatGameTime(gameTime)}`;
      } else {
        status = `idle @ ${formatGameTime(gameTime)}`;
      }
    }

    if (status !== lastStatus) {
      const ts = new Date().toISOString().slice(11, 19);
      console.log(`  [${ts}] ${status}`);
      lastStatus = status;
    }

    const elapsed = Date.now() - startedAt;
    const wait = Math.max(0, POLL_INTERVAL_MS - elapsed);
    await new Promise((r) => setTimeout(r, wait));
  }
}

main().catch((err) => {
  console.error(`\n  Counter Companion crashed:`, err);
  process.exit(1);
});
