"use client";

import Link from "next/link";
import { useRef } from "react";
import { motion } from "framer-motion";
import { MediaFrame } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import type { VideoItemDTO } from "@/lib/cms/types";

import styles from "./home.module.css";

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

  if (videos.length === 0) return null;

  const primaryVideo = videos[0];
  const secondaryVideos = videos.slice(1);
  const hasVideoSource = Boolean(primaryVideo?.videoMp4?.url || primaryVideo?.videoWebm?.url);

  function autoPlayVideo() {
    const el = videoRef.current;
    if (el) {
      el.muted = true;
      el.play().catch(() => {});
    }
  }

  return (
    <PageSection
      background="ink-dark"
      rhythm="compact"
      className={`${styles["video-teaser-section"]} ${styles["video-section"]}`}
      heading={{
        title,
        intro,
        action: (
          <Link
            href={ctaHref}
            className="group inline-flex items-center gap-2 border-b border-bone-300 pb-2 font-mono text-sm text-bone-50 uppercase transition-colors hover:border-teal-soft hover:text-teal-soft"
          >
            {ctaLabel}{" "}
            <span
              className="transition-transform duration-300 group-hover:translate-x-1"
              aria-hidden="true"
            >
              →
            </span>
          </Link>
        ),
      }}
    >
      <div className={styles["video-teaser"]}>
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
          onViewportEnter={autoPlayVideo}
        >
          {primaryVideo && (
            <Link href={ctaHref} className={styles["video-card"]}>
              <div className={styles["video-card__media"]}>
                {hasVideoSource ? (
                  <video
                    ref={videoRef}
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
                    alt={primaryVideo.title ?? "Video thumbnail"}
                    variant="wide"
                    className={styles["video-card__frame"]}
                  />
                )}
                <div className={styles["video-card__overlay"]} />
                <div className={styles["video-card__play"]}>
                  <span aria-hidden="true">▶</span>
                </div>
              </div>
            </Link>
          )}
        </motion.div>

        {secondaryVideos.length > 0 && (
          <motion.div
            className="flex flex-col gap-6"
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-100px" }}
            variants={{
              show: { transition: { staggerChildren: 0.15 } },
            }}
          >
            {secondaryVideos.map((video, idx) => (
              <motion.div
                key={idx}
                variants={{
                  hidden: { opacity: 0, x: 20 },
                  show: {
                    opacity: 1,
                    x: 0,
                    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const },
                  },
                }}
              >
                <Link href={ctaHref} className="block">
                  <div className="group flex cursor-pointer items-center gap-6 rounded-2xl p-2 transition-colors hover:bg-ink-soft">
                    <div className="relative aspect-video w-32 shrink-0 overflow-hidden rounded-xl bg-ink-soft">
                      <MediaFrame
                        media={video.thumbnail}
                        alt={video.title ?? "Video thumbnail"}
                        variant="wide"
                      />
                      <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                        <span className="text-white drop-shadow-md">▶</span>
                      </div>
                    </div>
                    <div className="line-clamp-2 font-semibold leading-tight text-bone-100 group-hover:text-bone-50">
                      {video.title}
                    </div>
                  </div>
                </Link>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </PageSection>
  );
}
