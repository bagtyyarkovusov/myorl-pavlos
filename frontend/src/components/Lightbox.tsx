"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";

import { useFocusTrap } from "@/lib/hooks/useFocusTrap";
import type { MediaDTO } from "@/lib/cms/types";

import styles from "./Lightbox.module.css";

export type LightboxImage = MediaDTO & {
  caption?: string | null;
};

type LightboxProps = {
  images: LightboxImage[];
  initialIndex: number;
  onClose: () => void;
};

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const touchStartX = useRef<number | null>(null);
  const dialogRef = useRef<HTMLDivElement>(null);
  useFocusTrap(dialogRef, true);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      switch (e.key) {
        case "Escape":
          onClose();
          break;
        case "ArrowRight":
          goNext();
          break;
        case "ArrowLeft":
          goPrev();
          break;
      }
    },
    [onClose, goNext, goPrev],
  );

  const handleBackdropClick = useCallback(
    (e: React.MouseEvent) => {
      if (e.target === e.currentTarget) {
        onClose();
      }
    },
    [onClose],
  );

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  }, []);

  const handleTouchEnd = useCallback(
    (e: React.TouchEvent) => {
      const startX = touchStartX.current;
      const endX = e.changedTouches[0]?.clientX;
      touchStartX.current = null;

      if (startX == null || endX == null) {
        return;
      }

      const deltaX = endX - startX;
      if (Math.abs(deltaX) < 48) {
        return;
      }

      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  const current = images[index]!;

  return (
    <div
      ref={dialogRef}
      role="dialog"
      aria-modal="true"
      aria-label="Image lightbox"
      className={styles.overlay}
      onClick={handleBackdropClick}
      onKeyDown={handleKeyDown}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      tabIndex={-1}
    >
      <button className={styles.close} onClick={onClose} aria-label="Close lightbox" type="button">
        ×
      </button>

      {images.length > 1 ? (
        <button
          className={`${styles.nav} ${styles["nav--prev"]}`}
          onClick={goPrev}
          aria-label="Previous image"
          type="button"
        >
          ‹
        </button>
      ) : null}

      <figure
        className={styles.content}
        data-current-index={index}
        onClick={(e) => e.stopPropagation()}
      >
        <Image
          src={current.url}
          alt={current.alternativeText ?? ""}
          width={current.width ?? 960}
          height={current.height ?? 640}
        />
        {current.caption ? (
          <figcaption className={styles.caption}>{current.caption}</figcaption>
        ) : null}
      </figure>

      {images.length > 1 ? (
        <button
          className={`${styles.nav} ${styles["nav--next"]}`}
          onClick={goNext}
          aria-label="Next image"
          type="button"
        >
          ›
        </button>
      ) : null}
    </div>
  );
}
