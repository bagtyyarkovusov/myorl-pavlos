import "server-only";

import { cache } from "react";
import { buildNavigationTree } from "./dto";
import { PAGE_POPULATE, toPageDTO } from "./page-normalizer";
import type {
  Locale,
  NavigationNodeDTO,
  PageDTO,
  StrapiListResponse,
  StrapiPagePayload,
} from "./types";
import { getCmsConfig } from "./env";
import { CmsError } from "./errors";

const PAGE_REVALIDATE_SECONDS = 300;

export const fetchNavigation = cache(async (locale: Locale): Promise<NavigationNodeDTO[]> => {
  const { pages } = await fetchAllPages(locale, [`navigation:${locale}`, "pages"]);
  return buildNavigationTree(pages, locale);
});

async function fetchAllPages(
  locale: Locale | undefined,
  tags: string[],
): Promise<{ pages: PageDTO[]; errors: number }> {
  const pages: PageDTO[] = [];
  let page = 1;
  let errors = 0;

  while (true) {
    const response = await fetchStrapi<StrapiListResponse<StrapiPagePayload>>(
      "/api/pages",
      {
        locale: locale ?? "all",
        status: "published",
        pagination: { page, pageSize: 100 },
        sort: ["locale:asc", "menuIndex:asc", "slug:asc"],
        populate: PAGE_POPULATE,
      },
      tags,
    );

    if (!response.data || response.data.length === 0) {
      break;
    }

    for (const item of response.data) {
      try {
        pages.push(toPageDTO(normalizeEntity(item)));
      } catch {
        errors += 1;
        if (process.env.NODE_ENV === "development") {
          console.warn(
            "[fetchAllPages] skipped malformed page",
            item && typeof item === "object"
              ? (item as Record<string, unknown>).documentId
              : undefined,
          );
        }
      }
    }

    if (response.data.length < 100) {
      break;
    }
    page += 1;
  }

  return { pages, errors };
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
    const isAbort = error instanceof DOMException && error.name === "TimeoutError";
    const errorType = isAbort ? "timeout" : "network";
    throw new CmsError(
      errorType,
      isAbort
        ? `Request to ${url.pathname} timed out after 5s.`
        : `Failed to connect to CMS at ${config.strapiUrl}. Is the Strapi backend running?`,
      { url: url.toString() },
    );
  }

  if (!response.ok) {
    throw new CmsError(
      response.status === 404 ? "not_found" : "server_error",
      `Strapi request failed: ${response.status} ${response.statusText} ${url.pathname}`,
      { status: response.status, url: url.toString() },
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
