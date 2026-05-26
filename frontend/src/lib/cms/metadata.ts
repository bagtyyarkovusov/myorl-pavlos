import type { Metadata } from "next";

import { getCmsConfig } from "./env";
import { addXDefault } from "./hreflang";
import { hrefForPage } from "./navigation";
import type { PageDTO } from "./types";

/**
 * Converts a {@link PageDTO} into a Next.js {@link Metadata} object.
 *
 * Sets `metadataBase`, canonical URL, OpenGraph (with image dimensions and
 * `siteName`), Twitter cards, and robots directives. System pages such as
 * `not-found` and `search-results` are automatically no-indexed.
 *
 * @param page - The normalized page data from the CMS.
 * @returns A Next.js `Metadata` object ready to be exported from
 *   `generateMetadata`.
 */
export function toPageMetadata(page: PageDTO): Metadata {
  const config = getCmsConfig();
  const isNoindexSystemPage =
    page.layoutVariant === "not-found" || page.layoutVariant === "search-results";
  const canonical = page.seo.canonicalUrl ?? new URL(hrefForPage(page), config.siteUrl).toString();

  const twitterImages = page.seo.ogImage ? [page.seo.ogImage.url] : undefined;

  return {
    metadataBase: new URL(config.siteUrl),
    title: page.seoTitle,
    description: page.seo.metaDescription ?? undefined,
    alternates: {
      canonical,
      languages: addXDefault({ ...page.alternateUrls }),
    },
    openGraph: {
      title: page.seoTitle,
      description: page.seo.metaDescription ?? undefined,
      url: canonical,
      locale: page.locale,
      siteName: "MyORL",
      type: "website",
      images: page.seo.ogImage
        ? [
            {
              url: page.seo.ogImage.url,
              width: page.seo.ogImage.width ?? undefined,
              height: page.seo.ogImage.height ?? undefined,
              alt: page.seo.ogImage.alternativeText ?? undefined,
            },
          ]
        : undefined,
    },
    twitter: {
      card: "summary_large_image",
      title: page.seoTitle,
      description: page.seo.metaDescription ?? undefined,
      images: twitterImages,
    },
    robots: {
      index: !page.seo.robotsNoindex && !isNoindexSystemPage,
      follow: !page.seo.robotsNofollow && !isNoindexSystemPage,
    },
  };
}
