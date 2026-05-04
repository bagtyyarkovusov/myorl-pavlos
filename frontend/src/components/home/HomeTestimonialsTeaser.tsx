import Link from "next/link";

import { PageSection } from "@/components/PageSection";
import { TestimonialsRatingBar } from "@/components/testimonials/TestimonialsRatingBar";
import { getHomeStrings } from "@/lib/i18n/home";
import type { Locale } from "@/lib/cms/types";
import type { HomeTestimonialsPayload } from "@/lib/testimonials/home-payload";

import { HomeTestimonialsTeaserQuotes } from "./HomeTestimonialsTeaserQuotes";
import styles from "./HomeTestimonialsTeaser.module.css";

export function HomeTestimonialsTeaser({
  locale,
  payload,
}: {
  locale: Locale;
  payload: HomeTestimonialsPayload;
}) {
  const t = getHomeStrings(locale);
  const fullHref = `/${locale}/${t.testimonialsListingSlug}`;

  return (
    <PageSection
      rhythm="compact"
      containerWidth="tight"
      className={`border-y border-stone-line ${styles.section}`}
      heading={{ title: t.testimonialsTitle }}
    >
      <div className={styles.ratingSlot}>
        <TestimonialsRatingBar
          className="justify-center text-center md:justify-start md:text-left"
          rating={payload.aggregateRating}
          userRatingCount={payload.userRatingCount}
          countTemplate={t.testimonialsReviewCountTemplate}
        />
      </div>

      <HomeTestimonialsTeaserQuotes
        quotes={payload.quotes}
        googleMapsUrl={payload.googleMapsUrl}
        expandLabel={t.testimonialsMobileExpand}
        collapseLabel={t.testimonialsMobileCollapse}
      />

      <div className={styles.actions}>
        <Link href={fullHref} className={`u-link ${styles.actionsLink}`}>
          {t.testimonialsViewAll}
        </Link>
        <a
          href={payload.googleMapsReviewsUrl}
          className={`u-link ${styles.actionsLink}`}
          target="_blank"
          rel="noopener noreferrer"
        >
          {t.testimonialsOpenMaps}
        </a>
        <p className={styles.source}>
          <a href={payload.googleMapsUrl} target="_blank" rel="noopener noreferrer" className={styles.sourceLink}>
            {t.testimonialsSourceLabel}
          </a>
        </p>
      </div>
    </PageSection>
  );
}
