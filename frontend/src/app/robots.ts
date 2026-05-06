import type { MetadataRoute } from "next";

import { getCmsConfig } from "@/lib/cms/env";

export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = getCmsConfig();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: "/search-results",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
    host: new URL(siteUrl).host,
  };
}
