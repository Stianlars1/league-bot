import Link from "next/link";

import styles from "./header.module.css";

interface HeaderProps {
  status?: "live" | "idle" | "error";
  meta?: string;
}

export function Header({ status = "idle", meta }: HeaderProps) {
  return (
    <header className={styles.header}>
      <Link href="/" className={styles.brand}>
        <span className={styles.brandMark} aria-hidden />
        <span className={styles.brandLabel}>
          <span>Counter</span>
          <span className={styles.brandSlash}>/</span>
          <span style={{ color: "hsl(var(--muted))", fontWeight: 400 }}>live draft coach</span>
        </span>
        <span className={styles.brandTag}>v0.1</span>
      </Link>
      <div className={styles.statusGroup}>
        {meta ? <span>{meta}</span> : null}
        {status === "live" ? (
          <span className={styles.live}>
            <span className={styles.liveDot} aria-hidden /> Live
          </span>
        ) : null}
      </div>
    </header>
  );
}
