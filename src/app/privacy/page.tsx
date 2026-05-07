import type { Metadata } from "next";

import { Header } from "@/components/header";

import styles from "@/components/legal-page.module.css";

export const metadata: Metadata = {
  title: "Privacy Policy · Peeked",
  description:
    "How Peeked handles your data. We read Riot API data on your behalf, keep an anonymous pairing token, and don't collect personal information beyond your Riot ID.",
};

const LAST_UPDATED = "2026-05-05";

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}>Legal</div>
          <h1 className={styles.headline}>Privacy Policy</h1>
          <p className={styles.lastUpdated}>Last updated {LAST_UPDATED}</p>
        </div>

        <section className={styles.section}>
          <p>
            Peeked is a real-time match analysis web app for League of Legends
            players. This page describes the data Peeked reads, what is stored,
            what is not stored, and how to contact us.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What we read</h2>
          <ul>
            <li>
              <strong>Riot ID</strong> — the <code>gameName#tagLine</code> you
              enter, used to look up your account and active match through
              Riot&apos;s public API.
            </li>
            <li>
              <strong>Match identifiers and match data</strong> — Riot match
              IDs and the public match details Riot returns for them.
            </li>
            <li>
              <strong>Live game frames</strong> — when you pair the Peeked
              Companion (a local process or browser extension running on your
              own machine), it reads Riot&apos;s Live Client Data API at{" "}
              <code>https://127.0.0.1:2999</code> and forwards game state
              frames to Peeked while you play.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What we store</h2>
          <ul>
            <li>
              <strong>An anonymous pairing token</strong> — a random
              cryptographic string that links a paired Companion to your
              browser session. It is not tied to your name, email, or Riot ID.
              You can revoke it at any time by clicking{" "}
              <strong>Unpair this browser</strong> on the Companion page.
            </li>
            <li>
              <strong>A small match metadata cache</strong> — Riot ID, region,
              and recent match IDs, kept so the live view loads quickly. This
              is fetched from Riot&apos;s public API and contains only data
              Riot already publishes.
            </li>
            <li>
              <strong>The most recent live frame for an active session</strong>{" "}
              — buffered in memory only. Frames are not retained after a
              session ends.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>What we don&apos;t collect</h2>
          <ul>
            <li>No email addresses, phone numbers, or contact information.</li>
            <li>No real names, addresses, or government-issued identifiers.</li>
            <li>No payment information.</li>
            <li>
              No third-party analytics, ad networks, or behavioural tracking.
            </li>
            <li>
              No selling, sharing, or licensing of your data to anyone, ever.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Third parties</h2>
          <p>
            Peeked queries <strong>Riot Games&apos; public API</strong> on your
            behalf. Your Riot ID and match data are subject to Riot&apos;s own
            policies. Peeked does not transmit your data to any other third
            party.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Cookies and local storage</h2>
          <p>
            Peeked uses your browser&apos;s <code>localStorage</code> to keep
            the anonymous Companion pairing token described above. We do not
            set tracking cookies.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Children</h2>
          <p>
            Peeked is intended for League of Legends players. The minimum age
            for a Riot account is set by Riot&apos;s own terms; we do not
            collect age information separately.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Changes to this policy</h2>
          <p>
            If this policy changes, the &ldquo;Last updated&rdquo; date at the
            top of this page will change with it.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Contact</h2>
          <p>
            Questions or requests:{" "}
            <span className={styles.todo}>{"{{TODO: contact email}}"}</span>
          </p>
        </section>

        <p className={styles.footer}>
          This policy applies to <code>https://peeked.app</code> and the Peeked
          Companion browser extension.
        </p>
      </main>
    </>
  );
}
