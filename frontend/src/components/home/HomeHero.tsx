"use client";

import { motion } from "framer-motion";
import { ButtonLink, MediaFrame } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import type { MediaDTO } from "@/lib/cms/types";

type HomeHeroProps = {
  kicker: string;
  title: React.ReactNode;
  excerpt?: string | null;
  media: MediaDTO | null;
  ctaHref: string;
  ctaLabel: string;
  trustItems: string[];
  mediaLabel?: string;
};

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.2, delayChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] as const } },
};

export function HomeHero({
  kicker,
  title,
  excerpt,
  media,
  ctaHref,
  ctaLabel,
  trustItems,
  mediaLabel,
}: HomeHeroProps) {
  return (
    <PageSection
      ariaLabelledBy="home-hero-title"
      className="relative overflow-hidden border-b border-stone-line pt-[clamp(76px,9vw,132px)] pb-0"
    >
      <div className="pointer-events-none absolute right-[-10%] top-[-18%] z-0 h-[56vw] max-h-[560px] w-[56vw] max-w-[560px] rounded-full bg-[radial-gradient(circle_at_45%_45%,var(--hero-glow)_0%,transparent_66%)]" />

      <motion.div
        className="relative z-10 grid grid-cols-1 items-end gap-12 pb-[clamp(42px,6vw,78px)] lg:grid-cols-[1.08fr_0.92fr] lg:gap-20"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <div className="flex flex-col items-start justify-end">
          <motion.p
            variants={itemVariants}
            className="mb-5 font-mono text-xs font-medium uppercase text-stone-soft sm:text-sm"
          >
            {kicker}
          </motion.p>
          <motion.h1
            id="home-hero-title"
            variants={itemVariants}
            className="mb-7 max-w-[780px] font-display text-5xl leading-[1.02] text-ink sm:text-6xl md:text-7xl lg:text-[5.8rem] lg:leading-[0.98]"
          >
            {title}
          </motion.h1>
          {excerpt ? (
            <motion.p
              variants={itemVariants}
              className="max-w-[560px] text-lg leading-[1.62] text-stone md:text-xl"
            >
              {excerpt}
            </motion.p>
          ) : null}
          <motion.div variants={itemVariants} className="mt-9">
            <ButtonLink href={ctaHref}>{ctaLabel}</ButtonLink>
          </motion.div>
        </div>

        <motion.div
          variants={itemVariants}
          className="relative mx-auto w-full max-w-[520px] lg:ml-auto"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-lg border border-stone-line bg-bone-200 shadow-2xl shadow-trust-soft/60">
            {media ? (
              <MediaFrame
                media={media}
                alt="Clinical portrait of Dr. Pavlos Tsolaridis"
                label={mediaLabel}
                eager
                variant="portrait"
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center">
                <span className="font-mono text-sm uppercase text-stone-soft">Clinical photo</span>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>

      {trustItems.length > 0 ? (
        <motion.ul
          className="relative z-10 grid border-t border-stone-line bg-bone-50/72 py-4 font-mono text-xs uppercase text-stone sm:grid-cols-2 lg:grid-cols-4"
          variants={containerVariants}
          initial="hidden"
          animate="show"
          role="list"
        >
          {trustItems.map((item) => (
            <motion.li
              key={item}
              className="border-stone-line px-4 py-2 first:pl-0 sm:border-l sm:first:border-l-0 lg:px-6"
              variants={itemVariants}
            >
              {item}
            </motion.li>
          ))}
        </motion.ul>
      ) : null}
    </PageSection>
  );
}
