import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageRenderer } from "@/components/PageRenderer";
import { fetchPageBySlug } from "@/lib/cms/client";
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

  const page = await fetchPageBySlug(locale, "index");
  return page ? toPageMetadata(page) : {};
}

export default async function LocaleHomePage({ params }: LocaleHomeProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const page = await fetchPageBySlug(locale, "index");
  if (!page) {
    notFound();
  }

  return <PageRenderer page={page} />;
}
