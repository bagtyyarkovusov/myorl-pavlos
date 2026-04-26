import { toMediaDTO } from "./media";
import { normalizeOptionalText } from "./text";
import type { SeoDTO, StrapiPagePayload, StrapiSeo } from "./types";

export function toSeoDTO(seo: StrapiSeo | null | undefined): SeoDTO {
  return {
    metaTitle: seo?.metaTitle ?? null,
    metaDescription: seo?.metaDescription ?? null,
    canonicalUrl: seo?.canonicalUrl ?? null,
    ogImage: toMediaDTO(seo?.ogImage),
    robotsNoindex: Boolean(seo?.robotsNoindex),
    robotsNofollow: Boolean(seo?.robotsNofollow),
    sitemapExclude: Boolean(seo?.sitemapExclude),
    sitemapPriority: normalizePriority(seo?.sitemapPriority),
    sitemapChangeFrequency: seo?.sitemapChangeFrequency ?? null,
  };
}

export function deriveSeoTitle(page: Pick<StrapiPagePayload, "title" | "seo">): string {
  return normalizeOptionalText(page.seo?.metaTitle) ?? page.title;
}

function normalizePriority(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") {
    return null;
  }
  const priority = Number(value);
  if (!Number.isFinite(priority)) {
    return null;
  }
  return Math.min(1, Math.max(0, priority));
}
