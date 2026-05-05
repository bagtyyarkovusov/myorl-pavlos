"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";

import type { MediaDTO } from "@/lib/cms/types";

import styles from "./Lightbox.module.css";

type LightboxProps = {
  images: MediaDTO[];
  initialIndex: number;
  onClose: () => void;
};

export function Lightbox({ images, initialIndex, onClose }: LightboxProps) {
  const [index, setIndex] = useState(initialIndex);
  const dialogRef = useRef<HTMLDivElement>(null);

  const goNext = useCallback(() => {
    setIndex((i) => (i + 1) % images.length);
  }, [images.length]);

  const goPrev = useCallback(() => {
    setIndex((i) => (i - 1 + images.length) % images.length);
  }, [images.length]);

  useEffect(() => {
    dialogRef.current?.focus();
  }, []);

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
      tabIndex={-1}
    >
      <button
        className={styles.close}
        onClick={onClose}
        aria-label="Close lightbox"
        type="button"
      >
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

      <div className={styles.content} onClick={(e) => e.stopPropagation()}>
        <Image
          src={current.url}
          alt={current.alternativeText ?? ""}
          width={current.width ?? 960}
          height={current.height ?? 640}
          unoptimized
        />
      </div>

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
