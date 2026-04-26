import "server-only";

import { buildNavigationTree, toPageDTO } from "./dto";
import { normalizeOptionalText } from "./text";
import type {
  GlobalSettingsDTO,
  Locale,
  NavigationNodeDTO,
  PageDTO,
  StrapiGlobalPayload,
  StrapiListResponse,
  StrapiPagePayload,
  StrapiSingleResponse,
} from "./types";
import { getCmsConfig } from "./env";

const PAGE_REVALIDATE_SECONDS = 300;

const pagePopulate = {
  seo: { populate: ["ogImage"] },
  parentPage: { fields: ["documentId", "slug", "title"] },
  localizations: { fields: ["documentId", "locale", "slug", "title"] },
  tags: { fields: ["name", "slug"] },
  featuredImage: true,
  imageCenter: true,
  pageSections: { populate: "*" },
  faqSection: { populate: { items: true } },
  accordionSection: { populate: { items: true } },
  tabsSection: { populate: { items: true } },
  gallerySection: { populate: { items: { populate: ["image"] } } },
  contactSection: { populate: { details: true, clinics: true } },
} as const;

export async function fetchPageBySlug(locale: Locale, slug: string): Promise<PageDTO | null> {
  const response = await fetchStrapi<StrapiListResponse<StrapiPagePayload>>(
    "/api/pages",
    {
      locale,
      status: "published",
      filters: { slug: { $eq: slug } },
      pagination: { pageSize: 1 },
      populate: pagePopulate,
    },
    [`page:${locale}:${slug}`, "pages", `navigation:${locale}`],
  );

  const page = response.data.at(0);
  return page ? toPageDTO(normalizeEntity(page)) : null;
}

export async function fetchNavigation(locale: Locale): Promise<NavigationNodeDTO[]> {
  const pages = await fetchAllPages(locale, [`navigation:${locale}`, "pages"]);
  return buildNavigationTree(pages, locale);
}

export async function fetchGlobalSettings(locale: Locale): Promise<GlobalSettingsDTO | null> {
  try {
    const response = await fetchStrapi<StrapiSingleResponse<StrapiGlobalPayload>>(
      "/api/global",
      { locale, status: "published" },
      [`global:${locale}`, "global"],
    );
    if (!response.data) {
      return null;
    }
    const entity = normalizeEntity(response.data);
    return {
      locale,
      address: normalizeOptionalText(entity.address),
      phoneTel: normalizeOptionalText(entity.phoneTel),
      phoneDisplay: normalizeOptionalText(entity.phoneDisplay),
      hours: normalizeOptionalText(entity.hours),
    };
  } catch {
    return null;
  }
}

export async function fetchSitemapPages(): Promise<PageDTO[]> {
  const pages = await fetchAllPages(undefined, ["pages", "sitemap"]);
  return pages.filter((page) => !page.seo.sitemapExclude);
}

async function fetchAllPages(locale: Locale | undefined, tags: string[]): Promise<PageDTO[]> {
  const pages: PageDTO[] = [];
  let page = 1;

  while (true) {
    const response = await fetchStrapi<StrapiListResponse<StrapiPagePayload>>(
      "/api/pages",
      {
        locale: locale ?? "all",
        status: "published",
        pagination: { page, pageSize: 100 },
        sort: ["locale:asc", "menuIndex:asc", "slug:asc"],
        populate: pagePopulate,
      },
      tags,
    );

    if (response.data.length === 0) {
      break;
    }

    pages.push(...response.data.map((item) => toPageDTO(normalizeEntity(item))));
    if (response.data.length < 100) {
      break;
    }
    page += 1;
  }

  return pages;
}

async function fetchStrapi<T>(
  path: string,
  params: Record<string, unknown>,
  tags: string[],
): Promise<T> {
  const config = getCmsConfig();
  const url = new URL(path, config.strapiUrl);
  appendSearchParams(url.searchParams, params);

  let response: Response;
  try {
    response = await fetch(url.toString(), {
      headers: {
        Accept: "application/json",
        ...(config.strapiToken ? { Authorization: `Bearer ${config.strapiToken}` } : {}),
      },
      next: {
        revalidate: PAGE_REVALIDATE_SECONDS,
        tags,
      },
      signal: AbortSignal.timeout(5000),
    });
  } catch (error) {
    console.error(`[CMS] Network error fetching ${url.pathname}:`, error);
    throw new Error(
      `Failed to connect to CMS at ${config.strapiUrl}. Is the Strapi backend running?`,
    );
  }

  if (!response.ok) {
    throw new Error(
      `Strapi request failed: ${response.status} ${response.statusText} ${url.pathname}`,
    );
  }

  return response.json() as Promise<T>;
}

function appendSearchParams(
  params: URLSearchParams,
  value: Record<string, unknown>,
  prefix?: string,
): void {
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined || child === null) {
      continue;
    }
    const nextKey = prefix ? `${prefix}[${key}]` : key;
    if (Array.isArray(child)) {
      child.forEach((item, index) => {
        const arrayKey = `${nextKey}[${index}]`;
        if (typeof item === "object" && item !== null) {
          appendSearchParams(params, item as Record<string, unknown>, arrayKey);
        } else {
          params.set(arrayKey, String(item));
        }
      });
    } else if (typeof child === "object") {
      appendSearchParams(params, child as Record<string, unknown>, nextKey);
    } else {
      params.set(nextKey, String(child));
    }
  }
}

function normalizeEntity<T extends Record<string, unknown>>(entity: T): T {
  const attributes = entity.attributes;
  if (attributes && typeof attributes === "object") {
    return { ...entity, ...(attributes as Record<string, unknown>) };
  }
  return entity;
}
