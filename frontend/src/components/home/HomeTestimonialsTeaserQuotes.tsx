"use client";

import { useEffect, useState } from "react";

import type { HomeTestimonialQuote } from "@/lib/testimonials/home-payload";

import styles from "./HomeTestimonialsTeaser.module.css";

const WIDE_BP = 768;
/** Collapsed mobile grid: up to four tight cells (2×2). */
const PREVIEW_CAP = 4;

function starsLabel(rating: number): string {
  const n = Math.round(Math.min(5, Math.max(0, rating)));
  return `${"★".repeat(n)}${"☆".repeat(5 - n)}`;
}

type HomeTestimonialsTeaserQuotesProps = {
  quotes: HomeTestimonialQuote[];
  googleMapsUrl: string;
  expandLabel: string;
  collapseLabel: string;
};

export function HomeTestimonialsTeaserQuotes({
  quotes,
  googleMapsUrl,
  expandLabel,
  collapseLabel,
}: HomeTestimonialsTeaserQuotesProps) {
  const [expanded, setExpanded] = useState(false);
  const [isWide, setIsWide] = useState(true);

  useEffect(() => {
    const mq = window.matchMedia(`(min-width: ${WIDE_BP}px)`);
    const apply = () => setIsWide(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  const showToggle = !isWide && quotes.length > 2;
  const isExpandedLayout = isWide || expanded;
  const preview = quotes.slice(0, PREVIEW_CAP);

  return (
    <div className={styles.quotesWrap}>
      {isExpandedLayout || !showToggle ? (
        <ul className={styles.list} role="list">
          {quotes.map((q, i) => (
            <li key={`${q.author}-${i}`} className={styles.item}>
              <blockquote className={styles.quote} cite={googleMapsUrl}>
                <p>{q.text}</p>
                <footer className={styles.meta}>
                  {q.author ? <span>{q.author}</span> : null}
                  {q.rating != null && q.rating > 0 ? (
                    <span aria-label={`${q.rating} of 5`}>{starsLabel(q.rating)}</span>
                  ) : null}
                  {q.relativeTime ? <span className={styles.metaTime}>{q.relativeTime}</span> : null}
                </footer>
              </blockquote>
            </li>
          ))}
        </ul>
      ) : (
        <ul className={styles.gridPreview} role="list">
          {preview.map((q, i) => (
            <li key={`${q.author}-p-${i}`} className={styles.itemCompact}>
              <blockquote className={styles.compactQuote} cite={googleMapsUrl}>
                <p className={styles.compactText}>{q.text}</p>
                <footer className={styles.compactMeta}>
                  {q.author ? <span>{q.author}</span> : null}
                  {q.rating != null && q.rating > 0 ? (
                    <span aria-label={`${q.rating} of 5`}>{starsLabel(q.rating)}</span>
                  ) : null}
                </footer>
              </blockquote>
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
