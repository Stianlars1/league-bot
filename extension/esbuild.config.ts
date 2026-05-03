/**
 * Build the Counter Companion extension into per-browser dist/ folders.
 *
 *   pnpm --filter counter-companion-extension build      # one-shot
 *   pnpm --filter counter-companion-extension watch      # rebuild on change
 *
 * Each target gets its own manifest.json + the same JS/HTML/CSS/assets payload.
 * Chrome/Edge load dist/chrome as an unpacked extension; Firefox loads
 * dist/firefox as a temporary add-on. Web Store / AMO submissions take a
 * .zip of the same directory.
 */

import { build, context, type BuildOptions } from "esbuild";
import { copyFile, cp, mkdir, rm } from "node:fs/promises";
import { dirname, join } from "node:path";

const ROOT = dirname(new URL(import.meta.url).pathname);
const TARGETS = ["chrome", "firefox"] as const;
type Target = (typeof TARGETS)[number];

const ENTRIES: Record<string, string> = {
  "background-sw": "src/background-sw.ts",
  "background-event": "src/background-event.ts",
  offscreen: "src/offscreen.ts",
  popup: "src/popup.ts",
};

const STATIC_FILES = ["src/popup.html", "src/popup.css", "src/offscreen.html"];

async function buildTarget(target: Target, watch: boolean): Promise<void> {
  const outdir = join(ROOT, "dist", target);
  await rm(outdir, { recursive: true, force: true });
  await mkdir(outdir, { recursive: true });

  const opts: BuildOptions = {
    entryPoints: Object.fromEntries(
      Object.entries(ENTRIES).map(([name, p]) => [name, join(ROOT, p)]),
    ),
    outdir,
    bundle: true,
    format: "esm",
    target: "es2022",
    sourcemap: "inline",
    logLevel: "info",
    define: { "process.env.NODE_ENV": JSON.stringify("production") },
  };

  if (watch) {
    const ctx = await context(opts);
    await ctx.watch();
    console.log(`[${target}] watching`);
  } else {
    await build(opts);
  }

  await copyFile(
    join(ROOT, "manifest", `manifest.${target}.json`),
    join(outdir, "manifest.json"),
  );

  for (const f of STATIC_FILES) {
    await copyFile(join(ROOT, f), join(outdir, f.replace(/^src\//, "")));
  }

  await cp(join(ROOT, "assets"), join(outdir, "assets"), { recursive: true });

  console.log(`[${target}] built → ${outdir}`);
}

const watch = process.argv.includes("--watch");

await Promise.all(TARGETS.map((t) => buildTarget(t, watch)));

if (!watch) {
  console.log("done");
}
