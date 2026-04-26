"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MediaFrame } from "@/components/design-system";
import type { VideoItemDTO } from "@/lib/cms/sections";

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
  const secondaryVideos = videos.slice(1);

  return (
    <section className="bg-[var(--ink)] text-[var(--bone-50)] py-24 md:py-32">
      <div className="container mx-auto">
        <header className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
          <div className="max-w-2xl">
            <h2 className="mb-6 font-display text-4xl text-[var(--bone-50)] md:text-5xl lg:text-6xl">
              {title}
            </h2>
            <p className="text-lg text-[var(--bone-300)]">{intro}</p>
          </div>
          <div className="shrink-0">
            <Link
              href={ctaHref}
              className="group inline-flex items-center gap-2 border-b border-[var(--bone-300)] pb-2 font-mono text-sm tracking-widest text-[var(--bone-50)] uppercase transition-colors hover:border-[var(--teal-soft)] hover:text-[var(--teal-soft)]"
            >
              {ctaLabel}{" "}
              <span
                className="transition-transform duration-300 group-hover:translate-x-1"
                aria-hidden="true"
              >
                →
              </span>
            </Link>
          </div>
        </header>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-[2fr_1fr] lg:gap-12">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
          >
            {primaryVideo && (
              <div className="group relative overflow-hidden rounded-3xl bg-[var(--ink-soft)] aspect-video shadow-2xl">
                <MediaFrame
                  media={primaryVideo.thumbnail}
                  alt={primaryVideo.title ?? "Video thumbnail"}
                  variant="wide"
                />
                <div className="absolute inset-0 bg-black/30 transition-colors duration-500 group-hover:bg-black/10" />
                <button
                  className="absolute inset-0 flex items-center justify-center"
                  type="button"
                  aria-label={`Play ${primaryVideo.title}`}
                >
                  <div className="flex h-20 w-20 items-center justify-center rounded-full bg-white/20 text-white backdrop-blur-md transition-transform duration-500 group-hover:scale-110">
                    <span className="ml-2 text-2xl" aria-hidden="true">
                      ▶
                    </span>
                  </div>
                </button>
              </div>
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
                  className="group flex cursor-pointer items-center gap-6 rounded-2xl p-2 transition-colors hover:bg-[var(--ink-soft)]"
                >
                  <div className="relative w-32 shrink-0 overflow-hidden rounded-xl aspect-video bg-[var(--ink-soft)]">
                    <MediaFrame
                      media={video.thumbnail}
                      alt={video.title ?? "Video thumbnail"}
                      variant="wide"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20 opacity-0 transition-opacity group-hover:opacity-100">
                      <span className="text-white drop-shadow-md">▶</span>
                    </div>
                  </div>
                  <div className="font-semibold text-[var(--bone-100)] group-hover:text-white line-clamp-2 leading-tight">
                    {video.title}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          )}
        </div>
      </div>
    </section>
  );
}
