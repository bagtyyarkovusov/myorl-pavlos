import Link from "next/link";

import { PageSection } from "@/components/PageSection";
import { TestimonialsRatingBar } from "@/components/testimonials/TestimonialsRatingBar";
import { getGooglePlaceReviewTeaser } from "@/lib/google/places";
import {
  buildGoogleMapsReviewsUrlFromPlaceId,
  getGoogleMapsListingUrlOnly,
  getGooglePlacesEnv,
} from "@/lib/google/places-env";
import { getHomeStrings } from "@/lib/i18n/home";
import { getCuratedTestimonials } from "@/lib/testimonials/curated";
import { paginate } from "@/lib/testimonials/paginate";
import type { PageLayoutProps } from "./_shared";
import { PageHeader } from "./_shared";
import { TestimonialsIndexQuotes } from "./TestimonialsIndexQuotes";

import styles from "./TestimonialsIndexPage.module.css";

const PAGE_SIZE = 30;

function formatPaginationSummary(template: string, current: number, total: number): string {
  return template.replace("{{current}}", String(current)).replace("{{total}}", String(total));
}

export async function TestimonialsIndexPage({
  page,
  currentPage,
}: PageLayoutProps & { currentPage: number }) {
  const t = getHomeStrings(page.locale);
  const items = getCuratedTestimonials(page.locale);
  const { slice, totalPages } = paginate(items, currentPage, PAGE_SIZE);
  const teaser = await getGooglePlaceReviewTeaser(page.locale);
  const listingUrl = teaser?.listingUrl ?? getGoogleMapsListingUrlOnly();
  const reviewsUrl =
    teaser?.reviewsUrl ??
    (getGooglePlacesEnv()
      ? buildGoogleMapsReviewsUrlFromPlaceId(getGooglePlacesEnv()!.placeId)
      : listingUrl);

  const basePath = `/${page.locale}/${page.slug}`;
  const pathForPage = (p: number) => (p <= 1 ? basePath : `${basePath}?page=${p}`);

  return (
    <div data-locale={page.locale}>
      <PageSection rhythm="standard" containerWidth="tight" className="border-b border-stone-line">
        <PageHeader page={page} kicker={null} />
        <div className={styles.toolbar}>
          <TestimonialsRatingBar
            className="justify-center text-center md:justify-start md:text-left"
            rating={teaser?.rating}
            userRatingCount={teaser?.userRatingCount}
            countTemplate={t.testimonialsReviewCountTemplate}
          />
          {reviewsUrl ? (
            <a
              href={reviewsUrl}
              className={`u-link font-medium ${styles.toolbarLink}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              {t.testimonialsOpenMaps}
            </a>
          ) : null}
        </div>

        <TestimonialsIndexQuotes
          items={slice}
          listingUrl={listingUrl}
          expandLabel={t.testimonialsMobileExpand}
          collapseLabel={t.testimonialsMobileCollapse}
        />

        {totalPages > 1 ? (
          <nav className={styles.nav} aria-label="Pagination">
            {currentPage > 1 ? (
              <Link href={pathForPage(currentPage - 1)} className="u-link font-medium">
                {t.testimonialsPaginationPrev}
              </Link>
            ) : (
              <span className="text-stone-soft">{t.testimonialsPaginationPrev}</span>
            )}
            <span className={styles.status}>
              {formatPaginationSummary(t.testimonialsPaginationSummary, currentPage, totalPages)}
            </span>
            {currentPage < totalPages ? (
              <Link href={pathForPage(currentPage + 1)} className="u-link font-medium">
                {t.testimonialsPaginationNext}
              </Link>
            ) : (
              <span className="text-stone-soft">{t.testimonialsPaginationNext}</span>
            )}
          </nav>
        ) : null}
      </PageSection>
    </div>
  );
}
