import "server-only";

import { notFound } from "next/navigation";
import { validatedFetch } from "./cms-fetch";
import { globalResponseSchema } from "./strapi-validators";
import { PAGE_POPULATE, pageListSchema, pageResponseSchema } from "./page-normalizer";
import { getCmsConfig } from "./env";
import { buildNavigationTree } from "./navigation";
import type { GlobalSettingsDTO, Locale, NavigationNodeDTO, PageDTO } from "./types";

export type CmsPageError =
  | { kind: "not_found"; locale: Locale; slug: string; message: string }
  | { kind: "network"; message: string; cause?: unknown }
  | { kind: "timeout"; message: string }
  | { kind: "server_error"; status: number; message: string }
  | { kind: "validation"; issues: string[]; raw: unknown; message: string };

export type PageResult = { ok: true; page: PageDTO } | { ok: false; error: CmsPageError };

export async function getPageResult(locale: Locale, slug: string): Promise<PageResult> {
  const config = getCmsConfig();

  try {
    const page = await validatedFetch(
      `${config.strapiUrl}/api/pages`,
      {
        locale,
        status: "published",
        "filters[slug][$eq]": slug,
        "pagination[pageSize]": 1,
        populate: PAGE_POPULATE,
      },
      pageResponseSchema,
    );

    if (!page) {
      return {
        ok: false,
        error: {
          kind: "not_found",
          locale,
          slug,
          message: `Page not found: ${locale}/${slug}`,
        },
      };
    }

    return { ok: true, page };
  } catch (error) {
    if (error && typeof error === "object" && "kind" in error) {
      return { ok: false, error: error as CmsPageError };
    }

    return {
      ok: false,
      error: {
        kind: "network",
        message: error instanceof Error ? error.message : "Unknown CMS error",
        cause: error,
      },
    };
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

export async function getSite(locale: Locale): Promise<SiteContext> {
  const config = getCmsConfig();
  const baseUrl = config.strapiUrl;

  const pagesPromise = (async (): Promise<NavigationNodeDTO[]> => {
    const allPages: PageDTO[] = [];
    let page = 1;

    while (true) {
      const batch = await validatedFetch(
        `${baseUrl}/api/pages`,
        {
          locale,
          status: "published",
          pagination: { page, pageSize: 100 },
          sort: ["locale:asc", "menuIndex:asc", "slug:asc"],
          populate: PAGE_POPULATE,
        },
        pageListSchema,
      );

      if (!batch || batch.length === 0) break;
      allPages.push(...batch);
      if (batch.length < 100) break;
      page += 1;
    }

    return buildNavigationTree(allPages, locale);
  })();

  const settingsPromise = (async (): Promise<GlobalSettingsDTO> => {
    const settings = await validatedFetch(
      `${baseUrl}/api/global`,
      { locale, status: "published" },
      globalResponseSchema,
    );

    if (!settings) {
      throw { kind: "not_found", message: "Global settings not found" };
    }

    return settings;
  })();

  const [navigation, settingsResult] = await Promise.allSettled([pagesPromise, settingsPromise]);

  const navigationResult = navigation.status === "fulfilled" ? navigation.value : [];
  const settings =
    settingsResult.status === "fulfilled"
      ? settingsResult.value
      : ({
          locale,
          address: null,
          phoneTel: null,
          phoneDisplay: null,
          hours: null,
        } as GlobalSettingsDTO);

  return { navigation: navigationResult, settings };
}

export async function getSitemapPages(): Promise<PageDTO[]> {
  const config = getCmsConfig();
  const baseUrl = config.strapiUrl;
  const pages: PageDTO[] = [];
  let page = 1;

  while (true) {
    try {
      const batch = await validatedFetch(
        `${baseUrl}/api/pages`,
        {
          locale: "all",
          status: "published",
          pagination: { page, pageSize: 100 },
          sort: ["locale:asc", "menuIndex:asc", "slug:asc"],
          populate: PAGE_POPULATE,
        },
        pageListSchema,
      );

      if (!batch || batch.length === 0) break;

      for (const item of batch) {
        if (!item.seo.sitemapExclude) {
          pages.push(item);
        }
      }

      if (batch.length < 100) break;
      page += 1;
    } catch {
      if (process.env.NODE_ENV === "development") {
        console.warn("[getSitemapPages] batch failed, continuing");
      }
      if (page === 1) break;
      page += 1;
    }
  }

  return pages;
}
