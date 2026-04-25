import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageRenderer } from "@/components/PageRenderer";
import { fetchPageBySlug } from "@/lib/cms/client";
import { hrefForPage } from "@/lib/cms/dto";
import { getCmsConfig } from "@/lib/cms/env";
import { isLocale } from "@/lib/cms/types";
import type { Locale, PageDTO } from "@/lib/cms/types";

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
  return page ? toMetadata(page) : {};
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

function toMetadata(page: PageDTO): Metadata {
  const config = getCmsConfig();
  const isNoindexSystemPage = page.layoutVariant === "not-found" || page.layoutVariant === "search-results";
  const canonical = page.seo.canonicalUrl ?? new URL(hrefForPage(page), config.siteUrl).toString();

  return {
    title: page.seoTitle,
    description: page.seo.metaDescription ?? undefined,
    alternates: {
      canonical,
      languages: languageAlternates(page.locale, page.slug, config.siteUrl),
    },
    openGraph: {
      title: page.seoTitle,
      description: page.seo.metaDescription ?? undefined,
      url: canonical,
      images: page.seo.ogImage ? [{ url: page.seo.ogImage.url }] : undefined,
    },
    robots: {
      index: !page.seo.robotsNoindex && !isNoindexSystemPage,
      follow: !page.seo.robotsNofollow && !isNoindexSystemPage,
    },
  };
}

function languageAlternates(locale: Locale, slug: string, siteUrl: string) {
  return {
    [locale]: new URL(slug === "index" ? `/${locale}` : `/${locale}/${slug}`, siteUrl).toString(),
  };
}
