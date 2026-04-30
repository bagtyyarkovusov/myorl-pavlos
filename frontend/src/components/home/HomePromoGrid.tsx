"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { MediaFrame } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import type { PromoSlideItemDTO } from "@/lib/cms/types";

import styles from "./home.module.css";

type HomePromoGridProps = {
  title: string;
  intro?: string | null;
  slides: PromoSlideItemDTO[];
  locale: string;
  learnMoreLabel: string;
};

const gridVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] as const } },
};

export function HomePromoGrid({
  title,
  intro,
  slides,
  locale,
  learnMoreLabel,
}: HomePromoGridProps) {
  if (slides.length === 0) return null;

  return (
    <PageSection heading={{ title, intro: intro ?? undefined }}>
      <motion.div
        className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:gap-6"
        variants={gridVariants}
        initial="hidden"
        whileInView="show"
        viewport={{ once: true, margin: "-50px" }}
      >
        {slides.map((slide, index) => {
          const href =
            slide.targetUrl ??
            (slide.targetPage?.slug ? `/${locale}/${slide.targetPage.slug}` : null);
          const isLink = Boolean(href);

          const cardContent = (
            <div className="group flex h-full flex-col overflow-hidden rounded-[2rem] border border-stone-line bg-bone-50 shadow-lg shadow-stone-line/20 transition-all duration-500 hover:-translate-y-1 hover:shadow-2xl hover:shadow-trust-soft/40">
              <div className={styles["media-surface"]}>
                {slide.image ? (
                  <MediaFrame media={slide.image} alt={slide.title || "Procedure"} variant="wide" />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="font-mono text-xs uppercase tracking-widest text-stone-soft">
                      Image
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-ink/50 via-transparent to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                <div className={styles["index-badge"]}>{String(index + 1).padStart(2, "0")}</div>
              </div>
              <div className="flex flex-1 flex-col p-6 md:p-8">
                <h3 className="mb-3 font-display text-xl leading-tight text-ink transition-colors group-hover:text-trust md:text-2xl">
                  {slide.title}
                </h3>
                {slide.description ? (
                  <p className="mb-6 text-sm leading-relaxed text-stone">{slide.description}</p>
                ) : null}
                {isLink ? (
                  <span className={`mt-auto inline-flex items-center gap-2 ${styles["link-text"]}`}>
                    {learnMoreLabel}
                    <span
                      className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1"
                      aria-hidden="true"
                    >
                      →
                    </span>
                  </span>
                ) : null}
              </div>
            </div>
          );

          if (isLink && href) {
            return (
              <Link key={index} href={href} className="block h-full">
                <motion.div variants={cardVariants} className="h-full">
                  {cardContent}
                </motion.div>
              </Link>
            );
          }

          return (
            <motion.div key={index} variants={cardVariants} className="h-full">
              {cardContent}
            </motion.div>
          );
        })}
      </motion.div>
    </PageSection>
  );
}
