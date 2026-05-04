"use client";

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
  if (videos.length === 0) return null;

  const primaryVideo = videos[0];
  const hasVideoSource = Boolean(primaryVideo?.videoMp4?.url || primaryVideo?.videoWebm?.url);

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
                <video
                  aria-hidden="true"
                  autoPlay
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
