import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageRenderer } from "@/components/PageRenderer";
import { getPage, getSite, getSitemapPages } from "@/lib/cms/cms-api";
import { toPageMetadata } from "@/lib/cms/metadata";
import { isLocale, LOCALES } from "@/lib/cms/types";
import { getHomeTestimonialsPayload } from "@/lib/testimonials/home-payload";

type LocaleHomeProps = {
  params: Promise<{
    locale: string;
  }>;
};

// Prerender the locale home pages at build and keep them fresh via ISR,
// matching the slug route ([locale]/[slug]). Without `revalidate` the home
// route rendered fully dynamically (no cache, ~3-4s per request); all data it
// reads is already cached (CMS gateway + Google Places), so ISR is safe.
//
// Only advertise prerender params when the CMS is reachable at build time
// (and actually has an index page) — CI runs Strapi-less validation builds, so
// fall back to on-demand ISR there. Mirrors the [slug] route, whose
// generateStaticParams returns [] when the CMS is unreachable.
export async function generateStaticParams() {
  try {
    const pages = await getSitemapPages();
    return LOCALES.filter((locale) =>
      pages.some((p) => p.locale === locale && p.slug === "index"),
    ).map((locale) => ({ locale }));
  } catch {
    return [];
  }
}

export const revalidate = 600;

export async function generateMetadata({ params }: LocaleHomeProps): Promise<Metadata> {
  const { locale } = await params;
  if (!isLocale(locale)) {
    return {};
  }

  try {
    const page = await getPage(locale, "index");
    return toPageMetadata(page);
  } catch {
    return {};
  }
}

export default async function LocaleHomePage({ params }: LocaleHomeProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const [page, site, homeTestimonials] = await Promise.all([
    getPage(locale, "index"),
    getSite(locale),
    getHomeTestimonialsPayload(locale),
  ]);

  const appointmentHref = site.appointmentHref;

  return (
    <PageRenderer
      page={page}
      appointmentHref={appointmentHref}
      navigation={site.navigation}
      directoryNavigation={site.directoryNavigation}
      globalSettings={site.settings}
      homeTestimonials={homeTestimonials}
    />
  );
}
