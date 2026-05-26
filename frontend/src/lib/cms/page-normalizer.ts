import { isLocale } from "./types";
import type {
  ContactClinicDTO,
  DisclaimerOverride,
  LayoutVariant,
  Locale,
  MediaDTO,
  PageDTO,
  PageRefDTO,
  SeoDTO,
  StrapiClinic,
  StrapiContactDetail,
  StrapiLocalization,
  StrapiMedia,
  StrapiPagePayload,
  StrapiPageRef,
  StrapiSeo,
  StrapiTag,
  TagDTO,
} from "./types";
import type { CmsConfig } from "./env";
import { toSemanticSections as _toSemanticSections } from "./section-normalizer";

/** @deprecated Import from `./section-normalizer` instead. */
export const toSemanticSections = _toSemanticSections;

// Re-exports for backward compatibility during the refactor transition.
// Consumers should migrate to importing from the dedicated modules below.
export { PAGE_POPULATE, NAVIGATION_POPULATE, SITEMAP_POPULATE } from "./cms-populate";
export { pageResponseSchema, pageListSchema } from "./page-parsers";

/**
 * Trims a string and returns `null` when empty or missing.
 *
 * @param value - Raw string value from the CMS.
 * @returns Trimmed non-empty string, or `null`.
 */
export function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized ? normalized : null;
}

/**
 * Coerces an unknown value to a trimmed string or `null`.
 *
 * @param value - Any value (typically from a loosely-typed CMS field).
 * @returns Trimmed string if the input is a string, otherwise `null`.
 */
export function optionalString(value: unknown): string | null {
  return typeof value === "string" ? normalizeOptionalText(value) : null;
}

/**
 * Normalises a Strapi media payload into a {@link MediaDTO}.
 *
 * Relative URLs are resolved against `strapiUrl`. Returns `null` when the
 * media has no URL.
 *
 * @param media - Raw Strapi media object.
 * @param strapiUrl - Base URL for resolving relative paths.
 * @returns A normalised media DTO, or `null`.
 */
export function toMediaDTO(
  media: StrapiMedia | null | undefined,
  strapiUrl?: string,
): MediaDTO | null {
  if (!media?.url) return null;
  return {
    url: resolveMediaUrl(media.url, strapiUrl),
    alternativeText: media.alternativeText ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
  };
}

function resolveMediaUrl(url: string, strapiUrl?: string): string {
  if (/^https?:\/\//i.test(url)) return url;
  const base = strapiUrl ?? process.env.STRAPI_URL ?? "";
  if (!base) {
    return url.startsWith("/") ? url : "/" + url;
  }
  return new URL(url, base).toString();
}

/**
 * Resolves the preview image for a page reference (center crop preferred).
 */
export function resolvePageRefMedia(
  ref: Pick<StrapiPageRef, "imageCenter" | "featuredImage">,
  strapiUrl?: string,
): MediaDTO | null {
  return toMediaDTO(ref.imageCenter ?? ref.featuredImage, strapiUrl);
}

/**
 * Normalises a Strapi page reference into a {@link PageRefDTO}.
 *
 * @param ref - Raw Strapi page reference.
 * @param strapiUrl - Base URL for resolving relative media paths.
 * @returns A minimal page reference DTO, or `null` if no document ID.
 */
export function toPageRefDTO(
  ref: StrapiPageRef | null | undefined,
  strapiUrl?: string,
): PageRefDTO | null {
  if (!ref?.documentId) return null;
  return {
    documentId: ref.documentId,
    slug: ref.slug ?? null,
    title: ref.title ?? null,
    featuredImage: resolvePageRefMedia(ref, strapiUrl),
  };
}

/**
 * Normalises a Strapi tag payload into a {@link TagDTO}.
 *
 * @param tag - Raw Strapi tag object.
 * @returns A tag DTO, or `null` if the input is empty.
 */
export function toTagDTO(tag: StrapiTag | null | undefined): TagDTO | null {
  const name = normalizeOptionalText(tag?.name);
  const slug = normalizeOptionalText(tag?.slug);
  if (!name || !slug) return null;
  return { name, slug };
}

/**
 * Normalises a Strapi SEO payload into a {@link SeoDTO}.
 *
 * Supplies sensible defaults for boolean flags and sitemap fields.
 *
 * @param seo - Raw Strapi SEO object.
 * @returns A fully populated SEO DTO.
 */
export function toSeoDTO(seo: StrapiSeo | null | undefined): SeoDTO {
  return {
    metaTitle: seo?.metaTitle ?? null,
    metaDescription: seo?.metaDescription ?? null,
    canonicalUrl: seo?.canonicalUrl ?? null,
    ogImage: toMediaDTO(seo?.ogImage),
    schemaType: seo?.schemaType ?? null,
    robotsNoindex: Boolean(seo?.robotsNoindex),
    robotsNofollow: Boolean(seo?.robotsNofollow),
    sitemapExclude: Boolean(seo?.sitemapExclude),
    sitemapPriority: normalizePriority(seo?.sitemapPriority),
    sitemapChangeFrequency: seo?.sitemapChangeFrequency ?? null,
  };
}

/**
 * Derives the SEO title for a page.
 *
 * Prefers the CMS `metaTitle` when present, falling back to the page `title`.
 *
 * @param page - Raw Strapi page with `title` and optional `seo.metaTitle`.
 * @returns The resolved SEO title string.
 */
export function deriveSeoTitle(page: Pick<StrapiPagePayload, "title" | "seo">): string {
  return normalizeOptionalText(page.seo?.metaTitle) ?? page.title;
}

function normalizeDisclaimerOverride(value: string | null | undefined): DisclaimerOverride {
  if (value === "force-show" || value === "force-hide") return value;
  return "default";
}

function normalizePriority(value: number | string | null | undefined): number | null {
  if (value === null || value === undefined || value === "") return null;
  const priority = Number(value);
  if (!Number.isFinite(priority)) return null;
  return Math.min(1, Math.max(0, priority));
}

function hrefForLocaleSlug(locale: Locale, slug: string): string {
  return slug === "index" ? `/${locale}` : `/${locale}/${slug}`;
}

function buildAlternateUrls(
  page: {
    locale: Locale;
    slug: string;
    localizations?: StrapiLocalization[] | null;
  },
  siteUrl?: string,
): Partial<Record<Locale, string>> {
  const resolve = (locale: Locale, slug: string): string => {
    const path = hrefForLocaleSlug(locale, slug);
    if (siteUrl) {
      return new URL(path, siteUrl).toString();
    }
    return path;
  };

  const urlByLocale = new Map<Locale, string>();
  urlByLocale.set(page.locale, resolve(page.locale, page.slug));

  for (const localization of page.localizations ?? []) {
    const locale = localization.locale;
    const slug = localization.slug;
    if (locale && isLocale(locale) && slug) {
      urlByLocale.set(locale, resolve(locale, slug));
    }
  }

  return Object.fromEntries(urlByLocale) as Partial<Record<Locale, string>>;
}

/**
 * Converts a raw Strapi page payload into a fully normalised {@link PageDTO}.
 *
 * This is the primary DTO boundary function per ADR-001. It coerces types,
 * resolves media URLs, derives the SEO title, builds alternate URLs, and
 * flattens `pageSections` into `sections`.
 *
 * @param page - Raw Strapi page payload.
 * @param config - Optional CMS config override (defaults to env).
 * @returns A complete, typed page DTO.
 */
export function toPageDTO(page: StrapiPagePayload, config?: CmsConfig): PageDTO {
  const renderMode =
    page.pageType === "system" && isFrontendNativeSystemLayout(page.layoutVariant)
      ? "frontend-native"
      : "cms";
  const menuTitle = normalizeOptionalText(page.menuTitle);
  const navLabel = menuTitle ?? page.title;

  const effective = config ?? {
    strapiUrl: process.env.STRAPI_URL ?? "",
    siteUrl: process.env.NEXT_PUBLIC_SITE_URL ?? "",
    token: process.env.STRAPI_API_TOKEN ?? "",
  };

  const seo = toSeoDTO(page.seo);

  return {
    documentId: page.documentId,
    locale: page.locale,
    slug: page.slug,
    title: page.title,
    menuTitle,
    navLabel,
    pageType: page.pageType,
    layoutVariant: page.layoutVariant,
    renderMode,
    seo,
    seoTitle: deriveSeoTitle(page),
    content: page.content ?? null,
    excerpt: page.excerpt ?? null,
    featuredImage: toMediaDTO(page.featuredImage, effective.strapiUrl),
    imageCenter: toMediaDTO(page.imageCenter, effective.strapiUrl),
    externalUrl: page.externalUrl ?? null,
    isFolder: Boolean(page.isFolder),
    hideFromMenu: Boolean(page.hideFromMenu),
    menuIndex: Number(page.menuIndex ?? 0),
    footerCategory: page.footerCategory ?? "none",
    parentPage: toPageRefDTO(page.parentPage, effective.strapiUrl),
    relatedPages: (page.relatedPages ?? [])
      .map((ref) => toPageRefDTO(ref, effective.strapiUrl))
      .filter((value): value is PageRefDTO => value !== null),
    relatedTopics: [],
    tags: (page.tags ?? []).map(toTagDTO).filter((value): value is TagDTO => value !== null),
    infoBlockBottom: page.infoBlockBottom ?? null,
    articleAuthor: page.articleAuthor ?? null,
    sources: page.sources ?? null,
    popUpClose: page.popUpClose ?? null,
    disclaimerOverride: normalizeDisclaimerOverride(page.disclaimerOverride),
    publishedAt: page.publishedAt ?? null,
    updatedAt: page.updatedAt ?? null,
    alternateUrls: buildAlternateUrls(page, effective.siteUrl),
    sections: _toSemanticSections(page),
  };
}

/**
 * Determines whether a layout variant should be rendered as a frontend-native
 * page rather than fetched from the CMS.
 *
 * @param layoutVariant - The page layout variant.
 * @returns `true` for system layouts like `not-found` and `sitemap`.
 */
export function isFrontendNativeSystemLayout(layoutVariant: LayoutVariant): boolean {
  return (
    layoutVariant === "not-found" ||
    layoutVariant === "search-results" ||
    layoutVariant === "sitemap" ||
    layoutVariant === "testimonials-index"
  );
}
