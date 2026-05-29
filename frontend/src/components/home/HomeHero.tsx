"use client";

import Image from "next/image";
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

export function HomeHero({ kicker, title, excerpt, media, ctaHref, ctaLabel }: HomeHeroProps) {
  const heroMedia = media ?? FALLBACK_HERO_MEDIA;

  return (
    <PageSection ariaLabelledBy="home-hero-title" rhythm="hero" className={styles["hero-section"]}>
      <div className={styles["hero-grid"]}>
        <div className={styles["hero-copy"]}>
          <p className={styles["hero-kicker"]}>{kicker}</p>
          <h1 id="home-hero-title" className={styles["hero-title"]}>
            {title}
          </h1>
          {excerpt ? <p className={styles["hero-lead"]}>{excerpt}</p> : null}
          <div className={styles["hero-cta"]}>
            <ButtonLink href={ctaHref} className={styles["hero-cta-button"]}>
              {ctaLabel}
            </ButtonLink>
          </div>
        </div>

        <div className={styles["hero-media-wrap"]}>
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
        </div>
      </div>
    </PageSection>
  );
}
