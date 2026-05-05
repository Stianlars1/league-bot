import Link from "next/link";

import { PeekedMark } from "./peeked-mark";
import styles from "./header.module.css";

interface HeaderProps {
  status?: "live" | "idle" | "error";
  meta?: string;
  viaCompanion?: boolean;
  /** Marketing surfaces only — animates a blinking cursor in the wordmark. */
  live?: boolean;
}

export function Header({ status = "idle", meta, viaCompanion = false, live = false }: HeaderProps) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand} aria-label="Peeked — home">
        <PeekedMark variant="lockup" live={live} />
      </Link>
      <div className={styles.statusGroup}>
        <Link href="/companion" className={styles.navLink}>
          Companion <span className={styles.navLinkBadge}>BETA</span>
        </Link>
        {meta ? <span>{meta}</span> : null}
        {status === "live" ? (
          <span className={styles.live} data-via-companion={viaCompanion ? "" : undefined}>
            <span className={styles.liveDot} aria-hidden />
            {viaCompanion ? "Live · via Companion" : "Live"}
          </span>
        ) : null}
      </div>
    </header>
  );
}
