import { ButtonLink } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import { TestimonialsRatingBar } from "@/components/testimonials/TestimonialsRatingBar";
import { getHomeStrings } from "@/lib/i18n/home";
import { cn } from "@/lib/utils";
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
      className={cn(
        styles.section,
        /* Tighter bottom than compact py so the action links sit nearer HomeVisitMapSection */
        "pb-5 md:pb-6",
      )}
      heading={{ title: t.testimonialsTitle }}
    >
      <div className={styles.ratingSlot}>
        <TestimonialsRatingBar
          className="w-full justify-center text-center lg:w-auto lg:justify-start lg:text-left"
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
        <ButtonLink href={fullHref} variant="primary" className={styles.actionBtn}>
          {t.testimonialsViewAll}
        </ButtonLink>
        <ButtonLink href={payload.googleMapsReviewsUrl} variant="secondary" className={styles.actionBtn}>
          {t.testimonialsOpenMaps}
        </ButtonLink>
      </div>
    </PageSection>
  );
}
