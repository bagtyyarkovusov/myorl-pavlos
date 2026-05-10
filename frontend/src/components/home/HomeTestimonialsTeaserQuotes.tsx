"use client";

import { useState, useRef, useEffect, useCallback } from "react";

import { cn } from "@/lib/utils";
import type { HomeTestimonialQuote } from "@/lib/testimonials/home-payload";

import styles from "./HomeTestimonialsTeaserQuotes.module.css";

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
  const [expandedCards, setExpandedCards] = useState<Set<number>>(new Set());
  const [overflowCards, setOverflowCards] = useState<Set<number>>(new Set());
  const textRefs = useRef<Map<number, HTMLParagraphElement>>(new Map());

  const toggleCard = useCallback((index: number) => {
    setExpandedCards((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    // Detect which cards have text that overflows the clamped line count.
    // scrollHeight reflects full unclamped content when -webkit-line-clamp is active.
    const overflows = new Set<number>();

    const raf = requestAnimationFrame(() => {
      textRefs.current.forEach((el, index) => {
        if (!el) return;
        // 2px tolerance for subpixel rounding
        if (el.scrollHeight > el.clientHeight + 2) {
          overflows.add(index);
        }
      });
      if (overflows.size > 0) {
        setOverflowCards(overflows);
      }
    });

    return () => cancelAnimationFrame(raf);
  }, [quotes]);

  return (
    <div className={styles.wrap}>
      <ul className={styles.grid} role="list">
        {quotes.map((q, i) => {
          const isExpanded = expandedCards.has(i);
          const hasOverflow = overflowCards.has(i);
          const showFade = hasOverflow && !isExpanded;

          return (
            <li key={`${q.author}-${i}`} className={cn(styles.gridItem, styles.card)}>
              <blockquote className={styles.cardBody} cite={googleMapsUrl}>
                <div className={cn(styles.textWrapper, showFade && styles.fadeActive)}>
                  <p
                    id={`testimonial-text-${i}`}
                    ref={(el) => {
                      if (el) {
                        textRefs.current.set(i, el);
                      } else {
                        textRefs.current.delete(i);
                      }
                    }}
                    className={cn(styles.text, isExpanded && styles.textExpanded)}
                  >
                    {q.text}
                  </p>
                </div>

                {hasOverflow ? (
                  <button
                    type="button"
                    className={styles.expandBtn}
                    onClick={() => toggleCard(i)}
                    aria-expanded={isExpanded}
                    aria-controls={`testimonial-text-${i}`}
                  >
                    {isExpanded ? collapseLabel : expandLabel}
                  </button>
                ) : null}

                <footer className={styles.meta}>
                  {q.author ? <span>{q.author}</span> : null}
                  {q.rating != null && q.rating > 0 ? (
                    <span aria-label={`${q.rating} of 5`}>{starsLabel(q.rating)}</span>
                  ) : null}
                  {q.relativeTime ? (
                    <span className={styles.metaTime}>{q.relativeTime}</span>
                  ) : null}
                </footer>
              </blockquote>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
