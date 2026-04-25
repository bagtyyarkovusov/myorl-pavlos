import type { MetadataRoute } from "next";

import { getCmsConfig } from "@/lib/cms/env";

export default function robots(): MetadataRoute.Robots {
  const { siteUrl } = getCmsConfig();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
    },
    sitemap: `${siteUrl}/sitemap.xml`,
  };
}
