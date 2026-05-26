import type { MetadataRoute } from "next";

import { getSitemapPages } from "@/lib/cms/cms-api";
import { hrefForPage } from "@/lib/cms/dto";
import { addXDefault } from "@/lib/cms/hreflang";
import { getSiteUrl } from "@/lib/cms/site-url";
import type { PageDTO } from "@/lib/cms/types";

export function buildAlternates(
  page: PageDTO,
  siteUrl: string,
): MetadataRoute.Sitemap[number]["alternates"] {
  const languages: Record<string, string> = {};
  for (const [locale, altPath] of Object.entries(page.alternateUrls)) {
    if (altPath) {
      languages[locale] = new URL(altPath, siteUrl).toString();
    }
  }

  if (Object.keys(languages).length === 0) {
    return undefined;
  }

  return { languages: addXDefault(languages) };
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const siteUrl = getSiteUrl();

  try {
    const pages = await getSitemapPages();
    return pages.map((page) => ({
      url: new URL(hrefForPage(page), siteUrl).toString(),
      lastModified: new Date(),
      changeFrequency: page.seo.sitemapChangeFrequency ?? "weekly",
      priority: page.seo.sitemapPriority ?? (page.slug === "index" ? 1 : 0.7),
      alternates: buildAlternates(page, siteUrl),
    }));
  } catch {
    return [
      {
        url: siteUrl,
        lastModified: new Date(),
        changeFrequency: "weekly",
        priority: 1,
      },
    ];
  }
}
