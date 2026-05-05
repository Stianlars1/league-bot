/**
 * Stopgap helper for the daily Riot dev-key rotation. Opens the Riot
 * developer dashboard in your DEFAULT browser (the one with your existing
 * session — no 2FA on most days, no Google "browser may not be secure"
 * block), then watches the clipboard. Copy the RGAPI key on the dashboard
 * and the script writes it to .env.local automatically.
 *
 * Why not Playwright: Google's SSO refuses to authenticate Playwright's
 * Chromium because it detects automation fingerprints (navigator.webdriver,
 * CDP signals). Stealth workarounds break unpredictably when Google updates
 * the check. The clipboard flow is dependency-free and survives any future
 * dashboard redesign — it doesn't read the DOM at all.
 *
 * Long-term fix: Riot's Personal Application Key. See
 * docs/riot-personal-application-key.md. Once approved this script is no
 * longer needed.
 *
 * Usage:
 *   pnpm refresh-key
 *
 * Platform: macOS (uses `open` + `pbpaste`). For Linux/Windows the
 * underlying commands need swapping (xdg-open + xclip, start + Get-Clipboard).
 */

import { exec } from "node:child_process";
import { promisify } from "node:util";
import { promises as fs } from "node:fs";
import path from "node:path";

const execP = promisify(exec);

const DASHBOARD_URL = "https://developer.riotgames.com/dashboard";
const ENV_PATH = path.resolve(process.cwd(), ".env.local");
const ENV_VAR = "RIOT_API_KEY";
const RIOT_KEY_PATTERN = /RGAPI-[0-9a-f-]{36}/;
const POLL_INTERVAL_MS = 500;
const TIMEOUT_MS = 5 * 60 * 1000;

async function readClipboard(): Promise<string> {
  if (process.platform !== "darwin") {
    throw new Error(
      `This helper is macOS-only right now (uses pbpaste). Detected: ${process.platform}. ` +
        "Copy the key manually into .env.local for now.",
    );
  }
  const { stdout } = await execP("pbpaste", { encoding: "utf8" });
  return stdout;
}

async function openInBrowser(url: string): Promise<void> {
  if (process.platform !== "darwin") {
    console.log(`→ Open this URL manually: ${url}`);
    return;
  }
  await execP(`open ${JSON.stringify(url)}`);
}

async function writeEnvLocal(key: string): Promise<{ replaced: boolean }> {
  let contents = "";
  try {
    contents = await fs.readFile(ENV_PATH, "utf8");
  } catch {
    // file doesn't exist — we'll create it
  }
  const line = `${ENV_VAR}=${key}`;
  if (contents.length === 0) {
    await fs.writeFile(ENV_PATH, line + "\n", "utf8");
    return { replaced: false };
  }
  const re = new RegExp(`^${ENV_VAR}=.*$`, "m");
  if (re.test(contents)) {
    const next = contents.replace(re, line);
    await fs.writeFile(ENV_PATH, next, "utf8");
    return { replaced: true };
  }
  // Variable not set yet — append (preserve trailing newline if present)
  const sep = contents.endsWith("\n") ? "" : "\n";
  await fs.writeFile(ENV_PATH, `${contents}${sep}${line}\n`, "utf8");
  return { replaced: false };
}

function extractKey(text: string): string | null {
  return text.match(RIOT_KEY_PATTERN)?.[0] ?? null;
}

async function main(): Promise<void> {
  // Snapshot the current clipboard so we don't accept whatever was already
  // there before the script started — only react to a NEW copy event.
  const initial = (await readClipboard()).trim();
  const initialKey = extractKey(initial);

  console.log(`→ Opening ${DASHBOARD_URL} in your default browser…`);
  await openInBrowser(DASHBOARD_URL);

  console.log("");
  console.log("→ On the dashboard, click your RGAPI key (or copy it any way).");
  console.log("  Watching clipboard for an RGAPI-… pattern. Press Ctrl+C to abort.");
  console.log("");

  const start = Date.now();
  while (Date.now() - start < TIMEOUT_MS) {
    await new Promise((r) => setTimeout(r, POLL_INTERVAL_MS));
    const current = (await readClipboard()).trim();
    if (current === initial) continue;
    const key = extractKey(current);
    if (!key) continue;
    if (key === initialKey) continue; // same key as before, not a fresh copy

    const { replaced } = await writeEnvLocal(key);
    console.log(`✓ ${replaced ? "Replaced" : "Wrote"} ${ENV_VAR} in .env.local`);
    console.log(`  ${key.slice(0, 12)}…${key.slice(-6)}`);
    console.log("  Restart any running dev server to pick up the new key.");
    return;
  }

  console.error("✗ Timed out after 5 min. No RGAPI key arrived in the clipboard.");
  process.exit(1);
}

main().catch((err) => {
  console.error("✗ Helper crashed:", err instanceof Error ? err.message : err);
  process.exit(1);
});
