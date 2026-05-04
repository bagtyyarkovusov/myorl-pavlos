import "server-only";

import { notFound } from "next/navigation";
import { cache } from "react";
import type { CmsGateway } from "./cms-gateway";
import { cms as productionGateway } from "./cms-gateway-setup";
import { globalResponseSchema } from "./strapi-validators";
import { buildNavigationTree } from "./navigation";
import { NAVIGATION_POPULATE, PAGE_POPULATE, SITEMAP_POPULATE } from "./page-normalizer";
import type { GlobalSettingsDTO, Locale, NavigationNodeDTO, PageDTO } from "./types";
import { CmsError } from "./errors";

let _gateway: CmsGateway | null = null;

function getGateway(): CmsGateway {
  return _gateway ?? productionGateway;
}

export function injectCmsGatewayForTesting(gw: CmsGateway): void {
  _gateway = gw;
}

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

export type PageResult = { ok: true; page: PageDTO } | { ok: false; error: CmsPageError };

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

export async function getPageResult(locale: Locale, slug: string): Promise<PageResult> {
  const gateway = getGateway();

  try {
    const page = await gateway.pages.one(slug, { locale, populate: PAGE_POPULATE });
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

export type SiteContext = {
  navigation: NavigationNodeDTO[];
  settings: GlobalSettingsDTO;
};

function buildFallbackSettings(locale: Locale): GlobalSettingsDTO {
  return {
    locale,
    address: null,
    phoneTel: null,
    phoneDisplay: null,
    hours: null,
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
    .then((pages) => buildNavigationTree(pages, locale));

  const settingsPromise = gateway.fetchOne("/api/global", globalResponseSchema, {
    locale,
  });

  const [navigationResult, settingsResult] = await Promise.allSettled([
    pagesPromise,
    settingsPromise,
  ]);

  const navigation = navigationResult.status === "fulfilled" ? navigationResult.value : [];
  const settings =
    settingsResult.status === "fulfilled" && settingsResult.value !== null
      ? settingsResult.value
      : buildFallbackSettings(locale);

  return { navigation, settings };
}

/** Per-request memoization when the layout and a page both need site context. */
export const getSite = cache(loadSite);

export async function getSitemapPages(): Promise<PageDTO[]> {
  const gateway = getGateway();

  const pages = await gateway.pages.all({
    locale: "all",
    sort: ["locale:asc", "menuIndex:asc", "slug:asc"],
    populate: SITEMAP_POPULATE,
  });

  return pages.filter((page) => !page.seo.sitemapExclude);
}
