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
  /** When false, renders a decorative preview (parent handles activation). */
  interactive?: boolean;
};

export function LiteYouTube({
  videoId,
  title,
  playLabel,
  variant = "full",
  activated,
  onActivate,
  interactive = true,
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

  const shellClassName = cn(
    styles.shell,
    isCompact && styles["shell--compact"],
    !interactive && styles["shell--preview"],
  );
  const preview = (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={thumbnail} alt="" className={styles.thumbnail} loading="lazy" decoding="async" />
      <span className={styles.play} aria-hidden="true">
        <span className={styles["play-icon"]} />
      </span>
    </>
  );

  if (!interactive) {
    return <div className={shellClassName}>{preview}</div>;
  }

  return (
    <button
      type="button"
      className={shellClassName}
      onClick={handleActivate}
      aria-label={playLabel}
    >
      {preview}
    </button>
  );
}
