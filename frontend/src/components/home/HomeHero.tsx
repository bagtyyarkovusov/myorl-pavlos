"use client";

import { motion } from "framer-motion";
import { MediaFrame } from "@/components/design-system";
import type { MediaDTO } from "@/lib/cms/types";
import { cn } from "@/lib/utils";

type HomeHeroProps = {
  kicker: string;
  title: React.ReactNode;
  excerpt?: string | null;
  media: MediaDTO | null;
  yearsLabel: string;
  yearsValue: string;
  langsLabel: string;
  langsValue: string;
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
  yearsLabel,
  yearsValue,
  langsLabel,
  langsValue,
}: HomeHeroProps) {
  return (
    <section
      className="relative overflow-hidden border-b border-[var(--line)] bg-[var(--background)] pb-16 pt-24 md:pb-32 md:pt-40"
      aria-labelledby="home-hero-title"
    >
      {/* Background ambient glow */}
      <div className="absolute right-[-10%] top-[-20%] z-0 h-[60vw] max-h-[600px] w-[60vw] max-w-[600px] rounded-full bg-[radial-gradient(circle_at_45%_45%,rgba(37,99,168,0.06)_0%,rgba(37,99,168,0)_64%)] pointer-events-none" />

      <motion.div
        className="container relative z-10 mx-auto grid grid-cols-1 items-center gap-12 lg:grid-cols-[1.2fr_1fr] lg:gap-20"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <div className="flex flex-col items-start justify-center">
          <motion.p
            variants={itemVariants}
            className="eyebrow mb-6 font-mono text-sm tracking-widest text-[var(--stone-soft)] uppercase"
          >
            {kicker}
          </motion.p>
          <motion.h1
            id="home-hero-title"
            variants={itemVariants}
            className="mb-8 font-display text-5xl leading-[1.05] tracking-tight text-[var(--ink)] sm:text-6xl md:text-7xl lg:text-[5.5rem] lg:leading-[0.95]"
          >
            {title}
          </motion.h1>
          {excerpt ? (
            <motion.p
              variants={itemVariants}
              className="max-w-[540px] text-lg leading-relaxed text-[var(--muted)] md:text-xl"
            >
              {excerpt}
            </motion.p>
          ) : null}
        </div>

        <motion.div
          variants={itemVariants}
          className="relative h-full w-full max-w-[560px] mx-auto lg:ml-auto"
        >
          <div className="relative aspect-[4/5] w-full overflow-hidden rounded-t-full rounded-b-[40px] border border-[var(--line)] shadow-2xl shadow-[var(--trust-soft)]/50">
            {media ? (
              <MediaFrame media={media} alt="Clinical hero image" priority variant="portrait" />
            ) : (
              <div className="h-full w-full bg-[var(--surface-soft)] flex items-center justify-center">
                <span className="font-mono text-[var(--stone-soft)]">Media</span>
              </div>
            )}
          </div>

          {/* Glassmorphism Stat Cards */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.8, duration: 0.8, ease: [0.16, 1, 0.3, 1] as const }}
            className="absolute bottom-12 -left-8 flex flex-col gap-4 md:-left-16"
          >
            <div className="flex flex-col items-start gap-1 rounded-2xl border border-white/20 bg-white/70 p-5 shadow-xl backdrop-blur-md">
              <span className="font-display text-4xl leading-none text-[var(--ink)]">
                {yearsValue}
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--stone)]">
                {yearsLabel}
              </span>
            </div>
            <div className="flex flex-col items-start gap-1 rounded-2xl border border-white/20 bg-white/70 p-5 shadow-xl backdrop-blur-md">
              <span className="font-display text-4xl leading-none text-[var(--ink)]">
                {langsValue}
              </span>
              <span className="font-mono text-xs uppercase tracking-wider text-[var(--stone)]">
                {langsLabel}
              </span>
            </div>
          </motion.div>
        </motion.div>
      </motion.div>
    </section>
  );
}
