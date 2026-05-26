import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";
import type { CmsGateway } from "./cms-gateway";
import { cms as productionGateway } from "./cms-gateway-setup";
import {
  GLOBAL_POPULATE,
  NAVIGATION_POPULATE,
  PAGE_POPULATE,
  SITEMAP_POPULATE,
  VIDEO_ENTRY_POPULATE,
} from "./cms-populate";
import { globalResponseSchema } from "./strapi-validators";
import { buildNavigationTree } from "./navigation";
import { resolveAppointmentHref } from "@/lib/navigation/appointment-href";
import { resolveContactHref } from "@/lib/navigation/contact-href";
import type { GlobalSettingsDTO, Locale, NavigationNodeDTO, PageDTO, VideoEntryDTO } from "./types";
import { CmsError } from "./errors";

let _gateway: CmsGateway | null = null;

function getGateway(): CmsGateway {
  return _gateway ?? productionGateway;
}

/**
 * Injects a mock gateway for testing purposes.
 *
 * @param gw - A {@link CmsGateway} mock to use instead of the production gateway.
 */
export function injectCmsGatewayForTesting(gw: CmsGateway): void {
  _gateway = gw;
}

/**
 * Discriminated union of all CMS error kinds that can surface to the UI.
 */
export type CmsPageError =
  | { kind: "not_found"; locale: Locale; slug: string; message: string }
  | { kind: "network"; message: string; cause?: unknown }
  | { kind: "timeout"; message: string }
  | { kind: "server_error"; status: number; message: string }
  | {
      kind: "validation";
      issues?: { path: (string | number)[]; message: string }[];
      raw?: unknown;
      message: string;
    };

/**
 * Result of attempting to fetch a single page.
 *
 * Use {@link getPageResult} for safe error handling, or {@link getPage} for
 * throw-on-failure semantics.
 */
export type PageResult = { ok: true; page: PageDTO } | { ok: false; error: CmsPageError };

export type VideoResult = { ok: true; video: VideoEntryDTO } | { ok: false; error: CmsPageError };

function toCmsPageError(error: unknown, locale: Locale, slug: string): CmsPageError {
  if (error instanceof CmsError) {
    switch (error.kind) {
      case "not_found":
        return { kind: "not_found", locale, slug, message: error.message };
      case "network":
        return { kind: "network", message: error.message, cause: error.cause };
      case "timeout":
        return { kind: "timeout", message: error.message };
      case "server_error":
        return { kind: "server_error", status: error.status ?? 500, message: error.message };
      case "validation":
        return {
          kind: "validation",
          issues: error.issues,
          raw: error.raw,
          message: error.message,
        };
    }
  }
  return {
    kind: "network",
    message: error instanceof Error ? error.message : "Unknown CMS error",
    cause: error,
  };
}

/**
 * Fetches a single page by locale and slug, returning a discriminated result.
 *
 * Unlike {@link getPage}, this never throws — failures are encoded in the
 * `PageResult` union so callers can handle errors explicitly.
 *
 * @param locale - The page locale.
 * @param slug - The page slug (e.g. `"about"`, `"index"`).
 * @returns A {@link PageResult} that is either `{ ok: true, page }` or
 *   `{ ok: false, error }`.
 */
export async function getPageResult(locale: Locale, slug: string): Promise<PageResult> {
  const gateway = getGateway();

  try {
    const page = await gateway.pages.one(slug, {
      locale,
      populate: PAGE_POPULATE,
      cacheTags: ["pages", "sitemap", "locale:" + locale],
    });
    if (!page) {
      return {
        ok: false,
        error: {
          kind: "not_found",
          locale,
          slug,
          message: "Page not found: " + locale + "/" + slug,
        },
      };
    }
    return { ok: true, page };
  } catch (error) {
    return { ok: false, error: toCmsPageError(error, locale, slug) };
  }
}

/**
 * Fetches a single page by Strapi document ID through the CMS gateway.
 *
 * This is used by the Search Index reindex endpoint, where webhook/operator
 * payloads identify content by document ID rather than localized slug.
 *
 * @param locale - The page locale.
 * @param documentId - The Strapi document ID.
 * @returns A {@link PageResult} with the matched page or an explicit error.
 */
export async function getPageByDocumentIdResult(
  locale: Locale,
  documentId: string,
): Promise<PageResult> {
  const gateway = getGateway();

  try {
    const pages = await gateway.pages.all({
      locale,
      filters: { documentId: { $eq: documentId } },
      populate: PAGE_POPULATE,
      pageSize: 1,
      maxPages: 1,
      cacheTags: ["pages", "sitemap", "locale:" + locale],
    });
    const page = pages[0];
    if (!page) {
      return {
        ok: false,
        error: {
          kind: "not_found",
          locale,
          slug: documentId,
          message: "Page not found: " + locale + "/" + documentId,
        },
      };
    }
    return { ok: true, page };
  } catch (error) {
    return { ok: false, error: toCmsPageError(error, locale, documentId) };
  }
}

/**
 * Fetches a single Video Entry by Strapi document ID through the CMS gateway.
 *
 * Used by the Search Index reindex endpoint to resolve Video Entries for
 * bulk indexing.
 *
 * @param locale - The video entry locale.
 * @param documentId - The Strapi document ID.
 * @returns A {@link VideoResult} with the matched video entry or an explicit error.
 */
export async function getVideoEntryByDocumentIdResult(
  locale: Locale,
  documentId: string,
): Promise<VideoResult> {
  const gateway = getGateway();

  try {
    const entries = await gateway.videoEntries.all({
      locale,
      filters: { documentId: { $eq: documentId } },
      populate: VIDEO_ENTRY_POPULATE,
      pageSize: 1,
      maxPages: 1,
      cacheTags: ["pages", "sitemap", "locale:" + locale],
    });
    const entry = entries[0];
    if (!entry) {
      return {
        ok: false,
        error: {
          kind: "not_found",
          locale,
          slug: documentId,
          message: "Video entry not found: " + locale + "/" + documentId,
        },
      };
    }
    return { ok: true, video: entry };
  } catch (error) {
    return { ok: false, error: toCmsPageError(error, locale, documentId) };
  }
}

/**
 * Fetches a single page and returns its {@link PageDTO}, or throws.
 *
 * A `not_found` error triggers Next.js `notFound()`. All other errors are
 * thrown as plain `Error` instances.
 *
 * @param locale - The page locale.
 * @param slug - The page slug.
 * @returns The resolved {@link PageDTO}.
 * @throws When the CMS request fails or the page is not found.
 */
export async function getPage(locale: Locale, slug: string): Promise<PageDTO> {
  const result = await getPageResult(locale, slug);
  if (!result.ok) {
    if (result.error.kind === "not_found") {
      notFound();
    }
    throw new Error(result.error.message);
  }
  return result.page;
}

/**
 * Site-wide context fetched once per request and cached via `React.cache`.
 *
 * @see {@link getSite}
 */
export type SiteContext = {
  navigation: NavigationNodeDTO[];
  directoryNavigation: NavigationNodeDTO[];
  footerNavigation: NavigationNodeDTO[];
  appointmentHref: string;
  contactHref: string;
  settings: GlobalSettingsDTO;
};

function buildFallbackSettings(locale: Locale): GlobalSettingsDTO {
  return {
    locale,
    address: null,
    phoneTel: null,
    phoneDisplay: null,
    secondaryPhoneTel: null,
    secondaryPhoneDisplay: null,
    email: null,
    hours: null,
    disclaimerText: null,
    socialLinks: [],
  };
}

async function mergeSocialLinksFromDefaultLocale(
  gateway: CmsGateway,
  settings: GlobalSettingsDTO,
  locale: Locale,
): Promise<GlobalSettingsDTO> {
  if (settings.socialLinks.length > 0 || locale === "el") {
    return settings;
  }

  const elSettings = await gateway.fetchOne("/api/global", globalResponseSchema, {
    locale: "el",
    populate: GLOBAL_POPULATE,
    cacheTags: ["global:el"],
  });

  if (!elSettings?.socialLinks.length) {
    return settings;
  }

  return {
    ...settings,
    socialLinks: elSettings.socialLinks,
  };
}

async function loadSite(locale: Locale): Promise<SiteContext> {
  const gateway = getGateway();

  const pagesPromise = gateway.pages
    .all({
      locale,
      sort: ["locale:asc", "menuIndex:asc", "slug:asc"],
      populate: NAVIGATION_POPULATE,
      cacheTags: ["navigation:" + locale, "pages"],
    })
    .then((pages) => ({
      pages,
      navigation: buildNavigationTree(pages, locale),
      directoryNavigation: buildNavigationTree(pages, locale, { includeHidden: true }),
      footerNavigation: buildNavigationTree(pages, locale, { includeHidden: true }),
      appointmentHref: resolveAppointmentHref(pages, locale),
      contactHref: resolveContactHref(pages, locale),
    }));

  const settingsPromise = gateway.fetchOne("/api/global", globalResponseSchema, {
    locale,
    populate: GLOBAL_POPULATE,
    cacheTags: ["global:" + locale],
  });

  const [pagesResult, settingsResult] = await Promise.allSettled([pagesPromise, settingsPromise]);

  const navigation = pagesResult.status === "fulfilled" ? pagesResult.value.navigation : [];
  const directoryNavigation =
    pagesResult.status === "fulfilled" ? pagesResult.value.directoryNavigation : [];
  const footerNavigation =
    pagesResult.status === "fulfilled" ? pagesResult.value.footerNavigation : [];
  const appointmentHref =
    pagesResult.status === "fulfilled"
      ? pagesResult.value.appointmentHref
      : resolveAppointmentHref([], locale);
  const contactHref =
    pagesResult.status === "fulfilled"
      ? pagesResult.value.contactHref
      : resolveContactHref([], locale);
  let settings =
    settingsResult.status === "fulfilled" && settingsResult.value !== null
      ? settingsResult.value
      : buildFallbackSettings(locale);

  settings = await mergeSocialLinksFromDefaultLocale(gateway, settings, locale);

  return {
    navigation,
    directoryNavigation,
    footerNavigation,
    appointmentHref,
    contactHref,
    settings,
  };
}

/**
 * Fetches site-wide context (navigation tree + global settings) for a locale.
 *
 * Wrapped in `React.cache` so multiple calls within the same request are
 * deduplicated. Falls back to empty navigation and default settings on failure.
 *
 * @param locale - The locale to fetch context for.
 * @returns Navigation tree and global settings.
 */
export const getSite = cache(loadSite);

/**
 * Returns all pages that should appear in the XML sitemap.
 *
 * Pages with `seo.sitemapExclude === true` are filtered out.
 *
 * @returns Array of {@link PageDTO} objects eligible for the sitemap.
 */
export async function getSitemapPages(): Promise<PageDTO[]> {
  const gateway = getGateway();

  const pages = await gateway.pages.all({
    locale: "all",
    sort: ["locale:asc", "menuIndex:asc", "slug:asc"],
    populate: SITEMAP_POPULATE,
    cacheTags: ["pages", "sitemap"],
  });

  return pages.filter((page) => !page.seo.sitemapExclude);
}
