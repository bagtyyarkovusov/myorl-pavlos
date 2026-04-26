import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageRenderer } from "@/components/PageRenderer";
import { fetchPageBySlug } from "@/lib/cms/client";
import { toPageMetadata } from "@/lib/cms/metadata";
import { isLocale } from "@/lib/cms/types";

type CmsPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) {
    return {};
  }

  const page = await fetchPageBySlug(locale, slug);
  return page ? toPageMetadata(page) : {};
}

export default async function CmsPage({ params }: CmsPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const page = await fetchPageBySlug(locale, slug);
  if (!page) {
    notFound();
  }

  return <PageRenderer page={page} />;
}
