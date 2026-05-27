"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { GalleryWithLightbox } from "@/components/GalleryWithLightbox";
import type { GalleryItemDTO } from "@/lib/cms/types";
import { getPageStrings } from "@/lib/i18n/page";
import type { Locale } from "@/lib/cms/types";

import styles from "./ClinicGalleryStrip.module.css";

type ClinicGalleryStripProps = {
  items: GalleryItemDTO[];
  locale: Locale;
};

const SCROLL_EDGE = 4;

export function ClinicGalleryStrip({ items, locale }: ClinicGalleryStripProps) {
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);
  const t = getPageStrings(locale);

  const updateScrollState = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    setCanScrollPrev(strip.scrollLeft > SCROLL_EDGE);
    setCanScrollNext(strip.scrollLeft + strip.clientWidth < strip.scrollWidth - SCROLL_EDGE);
  }, []);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip) return;

    updateScrollState();
    strip.addEventListener("scroll", updateScrollState, { passive: true });

    let resizeObserver: ResizeObserver | undefined;
    if (typeof ResizeObserver !== "undefined") {
      resizeObserver = new ResizeObserver(updateScrollState);
      resizeObserver.observe(strip);
      const grid = strip.firstElementChild;
      if (grid) resizeObserver.observe(grid);
    }

    const imgs = strip.querySelectorAll("img");
    imgs.forEach((img) => img.addEventListener("load", updateScrollState));

    const raf = requestAnimationFrame(updateScrollState);
    const delayed = window.setTimeout(updateScrollState, 400);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(delayed);
      strip.removeEventListener("scroll", updateScrollState);
      resizeObserver?.disconnect();
      imgs.forEach((img) => img.removeEventListener("load", updateScrollState));
    };
  }, [items.length, updateScrollState]);

  const scrollByItem = useCallback((direction: -1 | 1) => {
    const strip = stripRef.current;
    if (!strip) return;

    const tiles = strip.querySelectorAll<HTMLElement>("[data-clinic-strip-item]");
    if (tiles.length === 0) return;

    const stripLeft = strip.scrollLeft;
    const stripRight = stripLeft + strip.clientWidth;

    if (direction > 0) {
      for (const tile of tiles) {
        if (tile.offsetLeft + tile.offsetWidth > stripRight + SCROLL_EDGE) {
          strip.scrollTo({ left: tile.offsetLeft, behavior: "smooth" });
          return;
        }
      }
      strip.scrollTo({ left: strip.scrollWidth, behavior: "smooth" });
      return;
    }

    for (let index = tiles.length - 1; index >= 0; index -= 1) {
      const tile = tiles[index]!;
      if (tile.offsetLeft < stripLeft - SCROLL_EDGE) {
        strip.scrollTo({ left: tile.offsetLeft, behavior: "smooth" });
        return;
      }
    }
    strip.scrollTo({ left: 0, behavior: "smooth" });
  }, []);

  if (items.length === 0) return null;

  const hasOverflow = canScrollPrev || canScrollNext;
  const showControls = items.length > 1 && hasOverflow;

  return (
    <div className={styles.stripShell}>
      {showControls ? (
        <div className={styles.controls}>
          <button
            type="button"
            className={styles.control}
            aria-label={t.clinicGalleryPrevious}
            onClick={() => scrollByItem(-1)}
            disabled={!canScrollPrev}
          >
            ‹
          </button>
          <button
            type="button"
            className={styles.control}
            aria-label={t.clinicGalleryNext}
            onClick={() => scrollByItem(1)}
            disabled={!canScrollNext}
          >
            ›
          </button>
        </div>
      ) : null}
      <div
        ref={stripRef}
        className={styles.stripViewport}
        tabIndex={showControls ? 0 : undefined}
        aria-label={showControls ? t.clinicGalleryStripLabel : undefined}
      >
        <GalleryWithLightbox
          items={items}
          variant="clinic"
          className={styles.stripGrid}
          itemClassName={styles.stripItem}
        />
      </div>
    </div>
  );
}
