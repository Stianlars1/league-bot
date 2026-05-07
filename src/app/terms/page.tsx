import type { Metadata } from "next";

import { Header } from "@/components/header";

import styles from "@/components/legal-page.module.css";

export const metadata: Metadata = {
  title: "Terms of Service · Peeked",
  description:
    "The rules for using Peeked. Read-only against Riot's API, no warranty, your account on Riot's side is governed by Riot's terms.",
};

const LAST_UPDATED = "2026-05-05";

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className={styles.main}>
        <div className={styles.intro}>
          <div className={styles.eyebrow}>Legal</div>
          <h1 className={styles.headline}>Terms of Service</h1>
          <p className={styles.lastUpdated}>Last updated {LAST_UPDATED}</p>
        </div>

        <section className={styles.section}>
          <p>
            By using Peeked you agree to these terms. Peeked is a free,
            read-only match analysis tool for League of Legends. It calls
            Riot&apos;s public API on your behalf and presents the results.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Use at your own risk</h2>
          <p>
            Peeked is provided as-is, without warranty of any kind, express or
            implied. We do not guarantee that the service will be available,
            accurate, complete, or fit for any particular purpose. Match
            analysis is informational; in-game decisions remain yours.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Riot Games&apos; data</h2>
          <p>
            All match, account, and game-state data shown in Peeked originates
            from Riot Games. Riot&apos;s data is subject to Riot&apos;s own
            Terms of Service and Developer Policy. Peeked does not modify,
            re-package, or redistribute Riot&apos;s data outside the in-app
            display you see.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>No account required</h2>
          <p>
            Peeked does not require you to create an account, log in, or
            provide credentials. You enter a public Riot ID; we look it up. The
            optional Companion pairing uses an anonymous random token described
            in the Privacy Policy.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Acceptable use</h2>
          <ul>
            <li>
              Don&apos;t attempt to scrape Peeked or use it as a backend for
              another product. Riot&apos;s API rate limits cover everyone using
              the service.
            </li>
            <li>
              Don&apos;t use Peeked to harass, dox, stalk, or otherwise harm
              another player. The data shown is information Riot already
              publishes; you are still responsible for what you do with it.
            </li>
            <li>
              Don&apos;t attempt to bypass, disable, or interfere with the
              service or its security mechanisms.
            </li>
          </ul>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, Peeked and its operators
            are not liable for any indirect, incidental, special, consequential,
            or punitive damages, or any loss of data, goodwill, or revenue
            arising from your use of the service.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Changes to these terms</h2>
          <p>
            If these terms change, the &ldquo;Last updated&rdquo; date at the
            top of this page will change with it. Continued use of Peeked
            after a change constitutes acceptance of the updated terms.
          </p>
        </section>

        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Governing law</h2>
          <p>
            These terms are governed by the laws of{" "}
            <span className={styles.todo}>{"{{TODO: jurisdiction}}"}</span>,
            without regard to conflict-of-laws principles.
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
          These terms apply to <code>https://peeked.app</code> and the Peeked
          Companion browser extension.
        </p>
      </main>
    </>
  );
}
