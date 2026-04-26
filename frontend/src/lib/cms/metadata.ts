import type { Metadata } from "next";

import { getCmsConfig } from "./env";
import { hrefForPage } from "./navigation";
import type { PageDTO } from "./types";

export function toPageMetadata(page: PageDTO): Metadata {
  const config = getCmsConfig();
  const isNoindexSystemPage =
    page.layoutVariant === "not-found" || page.layoutVariant === "search-results";
  const canonical = page.seo.canonicalUrl ?? new URL(hrefForPage(page), config.siteUrl).toString();

  return {
    title: page.seoTitle,
    description: page.seo.metaDescription ?? undefined,
    alternates: {
      canonical,
      languages: page.alternateUrls,
    },
    openGraph: {
      title: page.seoTitle,
      description: page.seo.metaDescription ?? undefined,
      url: canonical,
      locale: page.locale,
      images: page.seo.ogImage ? [{ url: page.seo.ogImage.url }] : undefined,
    },
    robots: {
      index: !page.seo.robotsNoindex && !isNoindexSystemPage,
      follow: !page.seo.robotsNofollow && !isNoindexSystemPage,
    },
  };
}
