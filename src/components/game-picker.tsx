"use client";

import { motion, useReducedMotion } from "motion/react";
import { useRouter } from "next/navigation";
import { useLayoutEffect, useRef, useState } from "react";

import styles from "./game-picker.module.css";

type Game = "league" | "dota";

const GAMES: { id: Game; label: string; hint: string; caveat: string }[] = [
  {
    id: "league",
    label: "League of Legends",
    hint: 'Riot ID — e.g. "Faker#KR1"  (append "(euw1)" to override region)',
    caveat: "Riot's Spectator API has a built-in ~3 minute delay. Recommendations unlock once data goes live.",
  },
  {
    id: "dota",
    label: "Dota 2",
    hint: 'Steam account ID (32-bit) or full SteamID64 — e.g. "108108108"',
    caveat: "Stratz live coverage is best-effort — some public matches may not appear immediately.",
  },
];

export function GamePicker() {
  const router = useRouter();
  const reducedMotion = useReducedMotion();
  const [game, setGame] = useState<Game>("league");
  const [query, setQuery] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const tabRefs = useRef<Record<Game, HTMLButtonElement | null>>({ league: null, dota: null });
  const [pill, setPill] = useState<{ left: number; width: number } | null>(null);

  useLayoutEffect(() => {
    const el = tabRefs.current[game];
    if (!el) return;
    const parent = el.parentElement;
    if (!parent) return;
    setPill({
      left: el.offsetLeft,
      width: el.offsetWidth,
    });
  }, [game]);

  const active = GAMES.find((g) => g.id === game)!;

  async function onSubmit(e: { preventDefault: () => void }) {
    e.preventDefault();
    if (!query.trim()) return;
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/lookup", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ game, query }),
      });
      const json = (await res.json()) as
        | { player: { gameId: Game; externalId: string; displayName: string; region?: string } }
        | { error: string };
      if (!res.ok || "error" in json) {
        setError("error" in json ? json.error : `HTTP ${res.status}`);
        setSubmitting(false);
        return;
      }
      const params = new URLSearchParams({
        name: json.player.displayName,
      });
      if (json.player.region) params.set("region", json.player.region);
      router.push(`/live/${game}/${json.player.externalId}?${params.toString()}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Lookup failed");
      setSubmitting(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <motion.div
        initial={reducedMotion ? false : { opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, ease: [0.23, 1, 0.32, 1] }}
        className={styles.eyebrow}
      >
        Public APIs · Real-time · Zero installs
      </motion.div>

      <motion.h1
        initial={reducedMotion ? false : { opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.05, ease: [0.23, 1, 0.32, 1] }}
        className={styles.headline}
      >
        See what they&apos;re playing.
        <br />
        <span className={styles.headlineMark}>Counter it live.</span>
      </motion.h1>

      <motion.p
        initial={reducedMotion ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.15, ease: [0.23, 1, 0.32, 1] }}
        className={styles.lede}
      >
        Drop in your Riot ID or Steam account. We pull the live match, read the enemy
        composition, and tell your team exactly which items, runes, and strategies
        actually beat what you&apos;re facing — updated every 15 seconds.
      </motion.p>

      <div className={styles.tabs} role="tablist" aria-label="Select game">
        {pill ? (
          <motion.span
            className={styles.tabIndicator}
            initial={false}
            animate={{ left: pill.left, width: pill.width }}
            transition={{
              type: "spring",
              stiffness: 360,
              damping: 32,
              mass: 0.6,
            }}
            aria-hidden
          />
        ) : null}
        {GAMES.map((g) => (
          <button
            key={g.id}
            ref={(el) => {
              tabRefs.current[g.id] = el;
            }}
            type="button"
            role="tab"
            aria-selected={game === g.id}
            data-active={game === g.id}
            className={styles.tab}
            onClick={() => setGame(g.id)}
          >
            {g.label}
          </button>
        ))}
      </div>

      <form className={styles.formCard} onSubmit={onSubmit}>
        <label className={styles.label} htmlFor="player-id">
          Player identifier
        </label>
        <div className={styles.inputRow}>
          <input
            id="player-id"
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={active.hint}
            className={styles.input}
            autoComplete="off"
            spellCheck={false}
          />
          <button type="submit" className={styles.submit} disabled={submitting}>
            <span>{submitting ? "Looking up…" : "Track match"}</span>
            <span className={styles.submitArrow}>→</span>
          </button>
        </div>
        <p className={styles.hint}>{active.hint}</p>
        <div className={styles.caveat}>
          <span style={{ color: "hsl(var(--severity-medium))" }}>•</span>
          <span>{active.caveat}</span>
        </div>
        {error ? <div className={styles.error}>{error}</div> : null}
      </form>

      <div className={styles.featureGrid}>
        <Feature label="Damage profile" body="Counts AD/AP/Magical/Physical and surfaces the right resist items first." />
        <Feature label="Heal & shield breakers" body="Detects healing comps and sustains, prescribes Grievous Wounds / Spirit Vessel." />
        <Feature label="Tempo windows" body="Calls scaling vs early-game power and tells you when to force or stall." />
      </div>
    </div>
  );
}

function Feature({ label, body }: { label: string; body: string }) {
  return (
    <div className={styles.feature}>
      <div className={styles.featureLabel}>{label}</div>
      <div className={styles.featureBody}>{body}</div>
    </div>
  );
}
