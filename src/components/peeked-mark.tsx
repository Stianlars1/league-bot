// src/components/peeked-mark.tsx
import * as React from "react";

type Variant = "glyph" | "wordmark" | "lockup";

type Props = {
  variant?: Variant;
  size?: number;          // glyph height in px (lockup uses 0.85x for the wordmark)
  live?: boolean;         // wordmark cursor blink — only used by wordmark/lockup
  className?: string;
  "aria-label"?: string;
};

/**
 * Peeked brand mark — codename 02 / Slice.
 * Single SVG, three primitives: back rect, front rect, knockout slice.
 * Color comes from currentColor; the slice keys off --mark-knockout so the
 * cut matches whatever surface the mark is drawn on (set this on light surfaces).
 */
export function PeekedMark({
  variant = "lockup",
  size = 28,
  live = false,
  className,
  "aria-label": ariaLabel = "Peeked",
}: Props) {
  const Glyph = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role="img"
      aria-label={variant === "glyph" ? ariaLabel : undefined}
      aria-hidden={variant !== "glyph"}
    >
      <rect x="38" y="8" width="20" height="20" rx="1" fill="currentColor" opacity="0.45" />
      <path d="M 6 22 H 42 V 58 H 6 Z" fill="currentColor" />
      <path
        d="M 18 22 L 30 58 L 22 58 L 10 22 Z"
        fill="var(--mark-knockout, hsl(var(--background)))"
      />
    </svg>
  );

  if (variant === "glyph") {
    return <span className={className} style={{ display: "inline-flex", color: "hsl(var(--brand))" }}>{Glyph}</span>;
  }

  const wordSize = Math.round(size * 0.85);
  const Word = (
    <span
      className={className}
      style={{
        fontFamily: "var(--font-display, ui-monospace, monospace)",
        fontWeight: 600,
        fontSize: wordSize,
        letterSpacing: "-0.02em",
        display: "inline-flex",
        alignItems: "center",
        gap: "1px",
        lineHeight: 1,
      }}
    >
      <span>peeked</span>
      <span style={{ color: "hsl(var(--brand))", margin: "0 1px" }}>·</span>
      <span style={{ color: "hsl(var(--muted))", fontWeight: 400 }}>app</span>
      {live && (
        <span
          aria-hidden
          style={{
            display: "inline-block",
            width: Math.max(2, Math.round(wordSize * 0.08)),
            height: wordSize,
            background: "hsl(var(--brand))",
            marginLeft: 4,
            animation: "peeked-blink 1.05s steps(2, end) infinite",
          }}
        />
      )}
    </span>
  );

  if (variant === "wordmark") return Word;

  // lockup: glyph + wordmark, glyph in brand
  return (
    <span
      className={className}
      style={{ display: "inline-flex", alignItems: "center", gap: 12 }}
      aria-label={ariaLabel}
      role="img"
    >
      <span style={{ display: "inline-flex", color: "hsl(var(--brand))" }}>{Glyph}</span>
      {Word}
    </span>
  );
}
