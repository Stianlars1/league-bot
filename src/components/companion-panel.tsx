"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import styles from "./companion-panel.module.css";

const TOKEN_KEY = "counter:companion-token";

interface CompanionFrame {
  capturedAt: number;
  gameId: "league" | "dota";
  source: "live-client" | "gsi";
  payload: unknown;
}

interface AllGameDataPreview {
  gameData?: { gameMode?: string; gameTime?: number; mapName?: string };
  allPlayers?: { summonerName?: string; championName?: string; team?: string; level?: number; isDead?: boolean; scores?: { kills: number; deaths: number; assists: number; creepScore: number } }[];
  activePlayer?: { summonerName?: string; currentGold?: number };
}

type Status = "unpaired" | "pairing" | "waiting" | "live" | "error";

function readToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

function fmtClock(seconds?: number): string {
  if (typeof seconds !== "number") return "—:—";
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function fmtAge(ms: number): string {
  if (ms < 1500) return "just now";
  if (ms < 60_000) return `${Math.floor(ms / 1000)}s ago`;
  return `${Math.floor(ms / 60_000)}m ago`;
}

export function CompanionPanel() {
  const [status, setStatus] = useState<Status>("unpaired");
  const [token, setToken] = useState<string | null>(null);
  const [code, setCode] = useState<string | null>(null);
  const [codeExpiresAt, setCodeExpiresAt] = useState<number | null>(null);
  const [frame, setFrame] = useState<CompanionFrame | null>(null);
  const [frameCount, setFrameCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  // Re-render once per second so the pairing-code countdown ticks down.
  const [now, setNow] = useState(() => Date.now());
  const esRef = useRef<EventSource | null>(null);
  // True once we've persisted the token to localStorage. We defer the write
  // until the first frame arrives so a customer who clicks "Generate code"
  // and then closes the tab doesn't leave a dead token behind that fools the
  // live-view header into showing "via Companion".
  const persistedRef = useRef(false);

  useEffect(() => {
    // Deferred-read pattern: localStorage is browser-only, so this can't run
    // in render. A useState initializer would cause SSR/CSR hydration mismatch.
    const stored = readToken();
    if (stored) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- post-hydration localStorage read
      setToken(stored);
      persistedRef.current = true;
      setStatus("waiting");
    }
  }, []);

  useEffect(() => {
    // Always tick: drives the pairing-code countdown AND the frame-age display.
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);

  const codeExpired = codeExpiresAt !== null && codeExpiresAt - now <= 0;

  useEffect(() => {
    if (!codeExpired) return;
    // Reactive cleanup when the TTL elapses; can't be derived because we also
    // need to push status back to "unpaired" if no frames ever arrived.
    // eslint-disable-next-line react-hooks/set-state-in-effect -- TTL-elapsed cleanup
    setCode(null);
    setCodeExpiresAt(null);
    if (frameCount === 0) setStatus("unpaired");
  }, [codeExpired, frameCount]);

  const subscribe = useCallback((tok: string) => {
    esRef.current?.close();
    const es = new EventSource(`/api/companion/stream?token=${encodeURIComponent(tok)}`);
    esRef.current = es;
    es.addEventListener("frame", (ev) => {
      try {
        const f = JSON.parse((ev as MessageEvent).data) as CompanionFrame;
        setFrame(f);
        setFrameCount((n) => n + 1);
        setStatus("live");
        if (!persistedRef.current && typeof window !== "undefined") {
          window.localStorage.setItem(TOKEN_KEY, tok);
          persistedRef.current = true;
        }
      } catch {
        /* ignore */
      }
    });
    es.addEventListener("hello", () => {
      setStatus((s) => (s === "live" ? s : "waiting"));
    });
    // Server tells us the moment the companion claims the pairing code. Drop
    // the "paste this code" UI so a paired-but-no-game-running session doesn't
    // sit on a misleading code countdown for 5 minutes.
    es.addEventListener("claimed", () => {
      setCode(null);
      setCodeExpiresAt(null);
      setStatus((s) => (s === "live" ? s : "waiting"));
      if (!persistedRef.current && typeof window !== "undefined") {
        window.localStorage.setItem(TOKEN_KEY, tok);
        persistedRef.current = true;
      }
    });
    es.onopen = () => {
      // Successful (re)connect — drop any stale "interrupted" message.
      setError(null);
    };
    es.onerror = () => {
      // EventSource auto-reconnects when readyState is CONNECTING; only
      // surface an error if it's actually permanently CLOSED. Treating every
      // transient error as user-visible spammed the page with red text on
      // every Next.js HMR bounce.
      if (es.readyState === EventSource.CLOSED) {
        setError("Stream closed — try unpairing and pairing again.");
      }
    };
  }, []);

  useEffect(() => {
    if (!token) return;
    subscribe(token);
    return () => {
      esRef.current?.close();
      esRef.current = null;
    };
  }, [token, subscribe]);

  async function startPairing() {
    setError(null);
    setStatus("pairing");
    try {
      const res = await fetch("/api/companion/pair", { method: "POST" });
      if (!res.ok) throw new Error(`Pairing request failed (HTTP ${res.status})`);
      const { code: c, token: t, expiresAt } = (await res.json()) as {
        code: string;
        token: string;
        expiresAt: number;
      };
      setCode(c);
      setCodeExpiresAt(expiresAt);
      setToken(t);
      persistedRef.current = false;
      setStatus("waiting");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Pairing failed");
      setStatus("error");
    }
  }

  function reset() {
    esRef.current?.close();
    esRef.current = null;
    if (typeof window !== "undefined") {
      window.localStorage.removeItem(TOKEN_KEY);
    }
    persistedRef.current = false;
    setToken(null);
    setFrame(null);
    setFrameCount(0);
    setCode(null);
    setCodeExpiresAt(null);
    setStatus("unpaired");
    setError(null);
  }

  const preview = frame?.payload as AllGameDataPreview | undefined;
  const players = preview?.allPlayers ?? [];

  return (
    <section className={styles.panel}>
      <header className={styles.head}>
        <div>
          <div className={styles.eyebrow}>Peeked Companion</div>
          <h2 className={styles.title}>Developer preview</h2>
          <p className={styles.lede}>
            Local process that reads Riot&apos;s Live Client Data on the
            player&apos;s machine and streams it to Peeked. Distribution
            method for non-technical players is being evaluated.
          </p>
        </div>
        <span className={styles.statusPill} data-status={status}>
          {statusLabel(status)}
        </span>
      </header>

      {status === "unpaired" ? (
        <details className={styles.devDisclosure}>
          <summary className={styles.devSummary}>
            I&apos;m a developer or contributor — show the manual pairing flow
          </summary>
          <div className={styles.devBody}>
            <p className={styles.hint}>
              Generate a 6-character code below, then paste it into the
                Peeked Companion browser extension popup, or into the{" "}
              <code>pnpm companion:dev</code> CLI prompt if you&apos;re running
              the dev script. Codes are single-use and expire after 5 minutes.
            </p>
            <button type="button" className={styles.primary} onClick={startPairing}>
              Generate pairing code →
            </button>
            <p className={styles.hintMuted}>
              Source: <code>companion/poll.ts</code> + <code>extension/</code> ·
              architecture in <code>docs/companion-app.md</code>.
            </p>
          </div>
        </details>
      ) : null}

      {code && status === "waiting" ? (
        <div className={styles.codeBlock}>
          <div className={styles.codeLabel}>Pairing code</div>
          <div className={styles.code}>{code}</div>
          <div className={styles.codeMeta}>
            {codeExpiresAt && !codeExpired
              ? `Expires ${fmtCountdown(codeExpiresAt, now)}`
              : "Expired — generate a new one"}{" "}
            · paste into your Peeked Companion (extension popup or{" "}
            <code>pnpm companion:dev</code> prompt)
          </div>
        </div>
      ) : null}

      {token ? (
        <div className={styles.statusGrid}>
          <Stat label="Frames received" value={String(frameCount)} />
          <Stat
            label="Last frame"
            value={frame ? fmtAge(now - frame.capturedAt) : "—"}
          />
          <Stat
            label="Game time"
            value={fmtClock(preview?.gameData?.gameTime)}
          />
          <Stat label="Players seen" value={String(players.length)} />
        </div>
      ) : null}

      {players.length > 0 ? (
        <div className={styles.playerList}>
          {players.map((p, i) => (
            <div key={i} className={styles.playerRow} data-team={p.team?.toLowerCase()}>
              <span className={styles.playerChamp}>{p.championName ?? "?"}</span>
              <span className={styles.playerName}>{p.summonerName ?? `Player ${i + 1}`}</span>
              <span className={styles.playerKda}>
                {p.scores?.kills ?? 0}/{p.scores?.deaths ?? 0}/{p.scores?.assists ?? 0}
              </span>
              <span className={styles.playerCs}>{p.scores?.creepScore ?? 0} cs</span>
              <span className={styles.playerLvl}>L{p.level ?? "?"}</span>
            </div>
          ))}
        </div>
      ) : null}

      {error ? <div className={styles.error}>{error}</div> : null}

      {token ? (
        <button type="button" className={styles.secondary} onClick={reset}>
          Unpair this browser
        </button>
      ) : null}
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className={styles.stat}>
      <div className={styles.statLabel}>{label}</div>
      <div className={styles.statValue}>{value}</div>
    </div>
  );
}

function statusLabel(s: Status): string {
  switch (s) {
    case "unpaired":
      return "Beta — not connected";
    case "pairing":
      return "Requesting code…";
    case "waiting":
      return "Waiting for companion";
    case "live":
      return "Live";
    case "error":
      return "Stream lost";
  }
}

function fmtCountdown(expiresAt: number, now: number): string {
  const ms = expiresAt - now;
  if (ms <= 0) return "now";
  const m = Math.floor(ms / 60_000);
  const s = Math.floor((ms % 60_000) / 1000);
  return `in ${m}:${s.toString().padStart(2, "0")}`;
}
