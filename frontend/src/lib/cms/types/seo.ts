import type { MediaDTO } from "./common";

export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type SeoDTO = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogImage?: MediaDTO | null;
  robotsNoindex: boolean;
  robotsNofollow: boolean;
  sitemapExclude: boolean;
  sitemapPriority?: number | null;
  sitemapChangeFrequency?: SitemapChangeFrequency | null;
};

export type StrapiMedia = {
  url?: string | null;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type StrapiSeo = {
  metaTitle?: string | null;
  metaDescription?: string | null;
  canonicalUrl?: string | null;
  ogImage?: StrapiMedia | null;
  robotsNoindex?: boolean | null;
  robotsNofollow?: boolean | null;
  sitemapExclude?: boolean | null;
  sitemapPriority?: number | string | null;
  sitemapChangeFrequency?: SitemapChangeFrequency | null;
};
