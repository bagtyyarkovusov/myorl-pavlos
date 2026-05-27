import type { MetadataRoute } from "next";

import { getSiteUrl } from "@/lib/cms/site-url";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = getSiteUrl();

  // Disallow paths:
  // - `/*/search-results` matches `/el/search-results` and `/ru/search-results`
  //   (locale-prefixed). The bare `/search-results` rule shipped pre-launch
  //   matched a route that does not exist, leaving the real search results
  //   pages crawlable as thin content.
  // - `/admin` is bearer-token gated server-side but should also be advertised
  //   as off-limits for crawl-budget hygiene.
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/*/search-results", "/admin"],
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: new URL(siteUrl).host,
  };
}
