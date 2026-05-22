import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageRenderer } from "@/components/PageRenderer";
import { getPage, getSite } from "@/lib/cms/cms-api";
import { toPageMetadata } from "@/lib/cms/metadata";
import { isLocale } from "@/lib/cms/types";
import { getHomeTestimonialsPayload } from "@/lib/testimonials/home-payload";

type LocaleHomeProps = {
  params: Promise<{
    locale: string;
  }>;
};

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
