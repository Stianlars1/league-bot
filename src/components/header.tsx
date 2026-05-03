import Link from "next/link";

import styles from "./header.module.css";

interface HeaderProps {
  status?: "live" | "idle" | "error";
  meta?: string;
  viaCompanion?: boolean;
}

export function Header({ status = "idle", meta, viaCompanion = false }: HeaderProps) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandMark} aria-hidden />
        <span className={styles.brandLabel}>
          <span>Counter</span>
          <span className={styles.brandSlash}>/</span>
          <span className={styles.brandSubLabel}>live draft coach</span>
        </span>
        <span className={styles.brandTag}>v0.1</span>
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
