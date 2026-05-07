import Image from "next/image";
import Link from "next/link";

import type { MediaDTO } from "@/lib/cms/types";

import styles from "./PageHero.module.css";

type PageHeroVariant = "minimal" | "cinematic" | "compact" | "journal";

type Breadcrumb = {
  label: string;
  href: string;
};

type PageHeroPage = {
  title: string;
  excerpt?: string | null;
  featuredImage?: MediaDTO | null;
  imageCenter?: MediaDTO | null;
};

type PageHeroProps = {
  page: PageHeroPage;
  variant: PageHeroVariant;
  breadcrumbs?: Breadcrumb[];
  cta?: {
    label: string;
    href: string;
  };
  metadata?: string[];
};

export function PageHero({ page, variant, breadcrumbs = [], cta, metadata = [] }: PageHeroProps) {
  const media = page.imageCenter ?? page.featuredImage;
  const showMedia = variant === "cinematic" && media?.url;
  const showPortrait = variant === "journal" && media?.url;

  return (
    <header
      className={`${styles.hero} ${styles[variant]}`}
      data-hero-variant={variant}
      role="banner"
    >
      {showMedia ? (
        <div className={styles.media} data-hero-media>
          <Image
            src={media.url}
            alt={media.alternativeText || page.title}
            fill
            priority
            sizes="100vw"
          />
        </div>
      ) : null}
      <div className={styles.copy}>
        {breadcrumbs.length > 0 ? (
          <nav aria-label="Breadcrumbs" className={styles.breadcrumbs}>
            {breadcrumbs.map((breadcrumb) => (
              <span key={`${breadcrumb.href}-${breadcrumb.label}`}>
                <Link href={breadcrumb.href}>{breadcrumb.label}</Link>
              </span>
            ))}
          </nav>
        ) : null}
        <h1 className={styles.title}>{page.title}</h1>
        {page.excerpt ? <p className={styles.excerpt}>{page.excerpt}</p> : null}
        {metadata.length > 0 ? (
          <ul className={styles.metadata}>
            {metadata.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        ) : null}
        {cta ? (
          <Link className={styles.cta} href={cta.href}>
            {cta.label}
          </Link>
        ) : null}
      </div>
      {showPortrait ? (
        <div className={styles.portrait} data-hero-portrait>
          <Image src={media.url} alt={media.alternativeText || page.title} fill sizes="96px" />
        </div>
      ) : null}
    </header>
  );
}
