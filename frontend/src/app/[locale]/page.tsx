import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageRenderer } from "@/components/PageRenderer";
import { getPage, getSite } from "@/lib/cms/cms-api";
import { toPageMetadata } from "@/lib/cms/metadata";
import { isLocale, LOCALES } from "@/lib/cms/types";
import { getHomeTestimonialsPayload } from "@/lib/testimonials/home-payload";

type LocaleHomeProps = {
  params: Promise<{
    locale: string;
  }>;
};

// Prerender both locale home pages at build time and keep them fresh via ISR,
// matching the slug route ([locale]/[slug]). Without these the home route
// rendered fully dynamically (no cache, ~3-4s per request). All data fetches
// it uses are already cached (CMS gateway + Google Places), so ISR is safe.
export async function generateStaticParams() {
  return LOCALES.map((locale) => ({ locale }));
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
