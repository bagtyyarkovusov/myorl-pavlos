import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageRenderer } from "@/components/PageRenderer";
import { fetchNavigation } from "@/lib/cms/client";
import { getPage } from "@/lib/cms/cms-api";
import { findAppointmentHref } from "@/lib/navigation/appointment-href";
import { toPageMetadata } from "@/lib/cms/metadata";
import { isLocale } from "@/lib/cms/types";

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

  const [page, navigation] = await Promise.all([getPage(locale, "index"), fetchNavigation(locale)]);

  const appointmentHref = findAppointmentHref(navigation, locale);

  return <PageRenderer page={page} appointmentHref={appointmentHref} navigation={navigation} />;
}
