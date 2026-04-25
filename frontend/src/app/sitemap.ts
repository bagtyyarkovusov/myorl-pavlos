import type { MetadataRoute } from "next";

import { fetchSitemapPages } from "@/lib/cms/client";
import { hrefForPage } from "@/lib/cms/dto";
import { getCmsConfig } from "@/lib/cms/env";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const { siteUrl } = getCmsConfig();

  try {
    const pages = await fetchSitemapPages();
    return pages.map((page) => ({
      url: new URL(hrefForPage(page), siteUrl).toString(),
      lastModified: new Date(),
      changeFrequency: page.seo.sitemapChangeFrequency ?? "weekly",
      priority: page.seo.sitemapPriority ?? (page.slug === "index" ? 1 : 0.7),
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
