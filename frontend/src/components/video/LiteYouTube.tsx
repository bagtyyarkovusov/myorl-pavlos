"use client";

import { useState } from "react";

import { cn } from "@/lib/utils";

import styles from "./LiteYouTube.module.css";

type LiteYouTubeProps = {
  videoId: string;
  title: string;
  playLabel: string;
  /** Compact thumbnail for directory rows; expands to full player when activated. */
  variant?: "compact" | "full";
  activated?: boolean;
  onActivate?: () => void;
};

export function LiteYouTube({
  videoId,
  title,
  playLabel,
  variant = "full",
  activated,
  onActivate,
}: LiteYouTubeProps) {
  const [internalActivated, setInternalActivated] = useState(false);
  const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;
  const isCompact = variant === "compact";
  const isActivated = activated ?? internalActivated;

  const handleActivate = () => {
    onActivate?.();
    if (activated === undefined) {
      setInternalActivated(true);
    }
  };

  if (isActivated) {
    return (
      <div
        className={cn(styles.frame, isCompact && styles["frame--expanded"])}
        data-video-active="true"
      >
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
      className={cn(styles.shell, isCompact && styles["shell--compact"])}
      onClick={handleActivate}
      aria-label={playLabel}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbnail} alt="" className={styles.thumbnail} loading="lazy" decoding="async" />
      <span className={styles.play} aria-hidden="true">
        <span className={styles["play-icon"]} />
      </span>
    </button>
  );
}
