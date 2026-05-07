"use client";

import Image from "next/image";

import type { BuildStep, RecommendationSource } from "@/lib/games/types";

import styles from "./build-path.module.css";

interface BuildPathProps {
  steps: BuildStep[];
  /** Provenance for the whole list — drives the chip label. When absent
   *  we infer from the first step's `confidence`. */
  source?: RecommendationSource;
}

const DDRAGON_VERSION = "14.24.1"; // pinned to match league/icons.tsx
const DDRAGON_ITEM_BASE = `https://ddragon.leagueoflegends.com/cdn/${DDRAGON_VERSION}/img/item`;

function imageForItemId(itemId: string): string {
  return `${DDRAGON_ITEM_BASE}/${itemId}.png`;
}

function sourceChipLabel(source: RecommendationSource | undefined, fallbackConfidence: BuildStep["confidence"]): { label: string; tone: "rule" | "curated" | "empirical" } {
  if (source?.layer === 3) {
    return {
      label: `Backed by ${source.sampleSize.toLocaleString()} games · ${(source.winRate * 100).toFixed(0)}% wr · patch ${source.patch}`,
      tone: "empirical",
    };
  }
  if (source?.layer === 2) {
    return { label: "Curated · cited", tone: "curated" };
  }
  if (fallbackConfidence === "empirical") return { label: "Empirical", tone: "empirical" };
  if (fallbackConfidence === "curated") return { label: "Curated · cited", tone: "curated" };
  return { label: "Rule-based", tone: "rule" };
}

export function BuildPath({ steps, source }: BuildPathProps) {
  if (!steps || steps.length === 0) return null;

  const chip = sourceChipLabel(source, steps[0].confidence);

  return (
    <div className={styles.container}>
      <div className={styles.head}>
        <span className={styles.title}>Recommended next-buy</span>
        <span className={styles.chip} data-tone={chip.tone}>
          {chip.label}
        </span>
      </div>

      <ol className={styles.list}>
        {steps.map((step, idx) => (
          <li key={`${step.itemId}-${idx}`} className={styles.step}>
            <div className={styles.stepNumber} aria-hidden>
              {idx + 1}
            </div>
            <div className={styles.icon}>
              <Image
                src={imageForItemId(step.itemId)}
                alt=""
                width={32}
                height={32}
                unoptimized
                sizes="32px"
              />
            </div>
            <div className={styles.body}>
              <div className={styles.row}>
                <span className={styles.itemName}>{step.itemName}</span>
                <span className={styles.cost}>{step.cost.toLocaleString()}g</span>
              </div>
              {step.componentsOwned && step.componentsOwned.length > 0 ? (
                <p className={styles.componentNote}>
                  Upgrade from owned components — discounted from full recipe price.
                </p>
              ) : null}
              <p className={styles.reason}>{step.reason}</p>
              {step.cite ? (
                <p className={styles.cite}>
                  <span className={styles.citeLabel}>Source:</span> {step.cite}
                </p>
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}
