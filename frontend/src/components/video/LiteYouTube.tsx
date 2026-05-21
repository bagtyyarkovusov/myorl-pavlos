"use client";

import { useState } from "react";
import styles from "./LiteYouTube.module.css";

type LiteYouTubeProps = {
  videoId: string;
  title: string;
  playLabel: string;
};

export function LiteYouTube({ videoId, title, playLabel }: LiteYouTubeProps) {
  const [activated, setActivated] = useState(false);
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

  if (activated) {
    return (
      <div className={styles.frame}>
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      className={styles.shell}
      onClick={() => setActivated(true)}
      aria-label={playLabel}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbnail} alt="" className={styles.thumbnail} loading="lazy" decoding="async" />
      <span className={styles.play} aria-hidden="true">
        ▶
      </span>
    </button>
  );
}
