import type { Metadata } from "next";

import { CompanionPanel } from "@/components/companion-panel";
import { Header } from "@/components/header";

import styles from "./companion.module.css";

export const metadata: Metadata = {
  title: "Peeked Companion · Realtime data, owned end-to-end",
  description:
    "Peeked Companion — the local process that reads Riot's Live Client Data on the player's machine and streams it to Peeked. Developer preview.",
};

export default function CompanionPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}>Developer preview</div>
          <h1 className={styles.headline}>
            Realtime needs a process
            <br />
            <span className={styles.headlineMark}>on your own machine.</span>
          </h1>
          <p className={styles.lede}>
            Riot only publishes live in-game state to one place:{" "}
            <code>127.0.0.1:2999</code> on the player&apos;s own machine, by
            anti-cheat policy. Cloud spectator data runs three minutes behind.
            Peeked Companion is the small local process that reads the live
            feed. The distribution method for non-technical players is being
            designed.
          </p>
        </div>

        <CompanionPanel />

        <div className={styles.notes}>
          <h2 className={styles.notesTitle}>Where this is in development</h2>
          <ul className={styles.notesList}>
            <li>
              The Phase 0 companion is a Node script (<code>pnpm companion:dev</code>).
              It works end-to-end. It is not a customer-facing distribution.
            </li>
            <li>
              The customer distribution method (browser extension, native app,
              or hybrid) is being evaluated. No commitment yet.
            </li>
            <li>
              See <code>docs/companion-app.md</code> for the architecture and{" "}
              <code>docs/research-realtime.md</code> for the research trail.
            </li>
          </ul>
        </div>
      </main>
    </>
  );
}
