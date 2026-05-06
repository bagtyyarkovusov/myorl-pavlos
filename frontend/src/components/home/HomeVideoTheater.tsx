"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { MediaFrame } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import type { VideoItemDTO } from "@/lib/cms/types";

import styles from "./HomeVideoTheater.module.css";

type HomeVideoTheaterProps = {
  title: string;
  intro: string;
  videos: VideoItemDTO[];
  ctaLabel: string;
  ctaHref: string;
};

export function HomeVideoTheater({
  title,
  intro,
  videos,
  ctaLabel,
  ctaHref,
}: HomeVideoTheaterProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(true);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(() => {
    if (typeof window === "undefined" || !window.matchMedia) return false;
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  });

  useEffect(() => {
    if (typeof window === "undefined" || !window.matchMedia) return;
    const mql = window.matchMedia("(prefers-reduced-motion: reduce)");
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mql.addEventListener("change", handler);
    return () => mql.removeEventListener("change", handler);
  }, []);

  if (videos.length === 0) return null;

  const primaryVideo = videos[0];
  const hasVideoSource = Boolean(primaryVideo?.videoMp4?.url || primaryVideo?.videoWebm?.url);

  function togglePlay(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      void video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
  }

  return (
    <PageSection
      rhythm="compact"
      className={`${styles["video-teaser-section"]} ${styles["video-section"]}`}
      header={null}
    >
      <Link href={ctaHref} className={styles["video-teaser"]}>
        <div className={styles["video-card"]}>
          {primaryVideo && (
            <>
              {hasVideoSource ? (
                <>
                  <video
                    ref={videoRef}
                    aria-hidden="true"
                    autoPlay={!prefersReducedMotion}
                    muted
                    loop
                    playsInline
                    preload="metadata"
                    poster={primaryVideo.thumbnail?.url ?? undefined}
                  >
                    {primaryVideo.videoMp4?.url ? (
                      <source src={primaryVideo.videoMp4.url} type="video/mp4" />
                    ) : null}
                    {primaryVideo.videoWebm?.url ? (
                      <source src={primaryVideo.videoWebm.url} type="video/webm" />
                    ) : null}
                  </video>
                  <button
                    type="button"
                    onClick={togglePlay}
                    className={styles["video-pause-btn"]}
                    aria-label={isPlaying ? "Pause video" : "Play video"}
                  >
                    {isPlaying ? "⏸" : "▶"}
                  </button>
                </>
              ) : (
                <MediaFrame
                  media={primaryVideo.thumbnail}
                  alt=""
                  variant="wide"
                  className={styles["video-card__frame"]}
                />
              )}
              <div className={styles["video-card__overlay"]} />
              <div className={styles["video-card__copy"]}>
                <h2>{title}</h2>
                <span>{intro}</span>
                <strong>
                  <span className={styles["video-card__play"]} aria-hidden="true">
                    ▶
                  </span>
                  {ctaLabel}
                </strong>
              </div>
            </>
          )}
        </div>
      </Link>
    </PageSection>
  );
}
