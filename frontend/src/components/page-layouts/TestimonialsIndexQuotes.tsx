"use client";

import { useEffect, useState } from "react";

import type { CuratedTestimonial } from "@/lib/testimonials/curated";

import styles from "./TestimonialsIndexPage.module.css";

const WIDE_BP = 768;
const PREVIEW_CAP = 4;

type TestimonialsIndexQuotesProps = {
  items: CuratedTestimonial[];
  listingUrl: string | null;
  expandLabel: string;
  collapseLabel: string;
};

export function TestimonialsIndexQuotes({
  items,
  listingUrl,
  expandLabel,
  collapseLabel,
}: TestimonialsIndexQuotesProps) {
  const [expanded, setExpanded] = useState(false);
  const [isWide, setIsWide] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${WIDE_BP}px)`);
    const apply = () => setIsWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const showToggle = !isWide && items.length > 2;
  const isExpandedLayout = isWide || expanded;
  const preview = items.slice(0, PREVIEW_CAP);

  return (
    <div className={styles.quotesWrap}>
      {isExpandedLayout || !showToggle ? (
        <ul className={styles.list} role="list">
          {items.map((row) => (
            <li key={row.id} className={styles.item}>
              <div className={styles.row}>
                <blockquote className={styles.quote} cite={listingUrl ?? undefined}>
                  {row.quote}
                </blockquote>
                <p className={styles.meta}>
                  <span>{row.author}</span>
                  {row.rating != null ? (
                    <span aria-label={`${row.rating} of 5`}>{row.rating}★</span>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <ul className={styles.gridPreview} role="list">
          {preview.map((row) => (
            <li key={`${row.id}-p`} className={styles.itemCompact}>
              <div className={styles.rowCompact}>
                <blockquote className={styles.quoteCompact} cite={listingUrl ?? undefined}>
                  {row.quote}
                </blockquote>
                <p className={styles.metaCompact}>
                  <span>{row.author}</span>
                  {row.rating != null ? (
                    <span aria-label={`${row.rating} of 5`}>{row.rating}★</span>
                  ) : null}
                </p>
              </div>
            </li>
          ))}
        </ul>
      )}

      {showToggle ? (
        <div className={styles.toggleRow}>
          <button
            type="button"
            className={styles.toggleBtn}
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={isExpandedLayout}
          >
            {isExpandedLayout ? collapseLabel : expandLabel}
          </button>
        </div>
      ) : null}
    </div>
  );
}
