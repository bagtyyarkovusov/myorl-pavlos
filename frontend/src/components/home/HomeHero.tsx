"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { ButtonLink } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import type { MediaDTO } from "@/lib/cms/types";
import styles from "./HomeHero.module.css";

type HomeHeroProps = {
  kicker: string;
  title: React.ReactNode;
  excerpt?: string | null;
  media?: MediaDTO | null;
  ctaHref: string;
  ctaLabel: string;
};

const FALLBACK_HERO_MEDIA: MediaDTO = {
  url: "/home-hero-office.jpg",
  alternativeText: "MyORL practice interior in Athens",
  width: 1000,
  height: 563,
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

export function HomeHero({ kicker, title, excerpt, media, ctaHref, ctaLabel }: HomeHeroProps) {
  const heroMedia = media ?? FALLBACK_HERO_MEDIA;

  return (
    <PageSection ariaLabelledBy="home-hero-title" rhythm="hero" className={styles["hero-section"]}>
      <motion.div
        className={styles["hero-grid"]}
        variants={containerVariants}
        initial={false}
        animate="show"
      >
        <div className={styles["hero-copy"]}>
          <motion.p variants={itemVariants} className={styles["hero-kicker"]}>
            {kicker}
          </motion.p>
          <motion.h1 id="home-hero-title" variants={itemVariants} className={styles["hero-title"]}>
            {title}
          </motion.h1>
          {excerpt ? (
            <motion.p variants={itemVariants} className={styles["hero-lead"]}>
              {excerpt}
            </motion.p>
          ) : null}
          <motion.div variants={itemVariants} className={styles["hero-cta"]}>
            <ButtonLink href={ctaHref} className={styles["hero-cta-button"]}>
              {ctaLabel}
            </ButtonLink>
          </motion.div>
        </div>

        <motion.div variants={itemVariants} className={styles["hero-media-wrap"]}>
          <div className={styles["hero-media-frame"]}>
            <Image
              src={heroMedia.url}
              alt={heroMedia.alternativeText ?? ""}
              fill
              priority
              sizes="(max-width: 719px) 90vw, (max-width: 1023px) 60vw, 40vw"
              className={styles["hero-media-image"]}
            />
          </div>
        </motion.div>
      </motion.div>
    </PageSection>
  );
}
