"use client";

import { useState } from "react";

import styles from "./LiteMap.module.css";

type LiteMapProps = {
  /** Google Maps embed URL — only requested after the user clicks. */
  src: string;
  title: string;
  loadLabel: string;
  /** Optional secondary line on the facade, e.g. the clinic address. */
  hint?: string | null;
  /**
   * When set, the facade opens this URL in a new tab instead of loading the
   * iframe in-place. Use for surfaces that should open Google Maps externally.
   */
  externalHref?: string;
};

/**
 * Privacy-friendly, click-to-load map. Renders a dimmed placeholder (no Google
 * request) until the visitor activates it — avoids third-party calls on first
 * paint and the "Google blocks the embed" problem. Modeled on {@link LiteYouTube}.
 *
 * When `externalHref` is set, clicking the facade opens Google Maps in a new
 * tab rather than embedding the map in-page.
 */
export function LiteMap({ src, title, loadLabel, hint, externalHref }: LiteMapProps) {
  const [loaded, setLoaded] = useState(false);

  if (loaded) {
    if (externalHref) {
      return null;
    }

    return (
      <iframe
        className={styles.frame}
        title={title}
        src={src}
        loading="lazy"
        referrerPolicy="no-referrer-when-downgrade"
        allowFullScreen
      />
    );
  }

  const handleClick = () => {
    if (externalHref) {
      window.open(externalHref, "_blank", "noopener,noreferrer");
      setLoaded(true);
      return;
    }
    setLoaded(true);
  };

  return (
    <button type="button" className={styles.facade} onClick={handleClick} aria-label={loadLabel}>
      <span className={styles.grid} aria-hidden="true" />
      <span className={styles.badge}>
        <svg
          className={styles.pin}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          strokeLinejoin="round"
          aria-hidden="true"
        >
          <path d="M12 21s-6.5-5.8-6.5-10.5a6.5 6.5 0 1 1 13 0C18.5 15.2 12 21 12 21z" />
          <circle cx="12" cy="10.5" r="2.3" />
        </svg>
        <span className={styles.label}>{loadLabel}</span>
        {hint ? <span className={styles.hint}>{hint}</span> : null}
      </span>
    </button>
  );
}
