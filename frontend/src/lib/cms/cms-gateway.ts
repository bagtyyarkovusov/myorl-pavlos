import { z, type ZodSchema } from "zod";
import { CmsError } from "./errors";
import { pageResponseSchema, toPageDTO } from "./page-normalizer";
import type { PageDTO, StrapiPagePayload } from "./types";

export { type PageDTO };

export interface FetchOneOptions {
  locale?: string;
  populate?: string | string[] | Record<string, unknown>;
  filters?: Record<string, unknown>;
  fields?: string[];
  sort?: string | string[];
  cacheTags?: string[];
  signal?: AbortSignal;
}

export interface FetchAllOptions extends FetchOneOptions {
  pageSize?: number;
  maxPages?: number;
}

export interface CmsGatewayCacheConfig {
  fetchInit?: (tags: string[]) => Partial<RequestInit>;
  dedupe?: (fn: (...args: unknown[]) => unknown) => (...args: unknown[]) => unknown;
}

export interface CmsGatewayConfig {
  baseUrl: string;
  token?: string;
  fetchFn?: typeof globalThis.fetch;
  timeoutMs?: number;
  maxRetries?: number;
  retryBaseDelayMs?: number;
  cache?: CmsGatewayCacheConfig;
}

export interface CmsGateway {
  pages: {
    all(opts?: FetchAllOptions): Promise<PageDTO[]>;
    one(slug: string, opts?: FetchOneOptions): Promise<PageDTO | null>;
  };
  fetchOne<T>(endpoint: string, schema: ZodSchema<T>, opts?: FetchOneOptions): Promise<T | null>;
  fetchAll<T>(endpoint: string, schema: ZodSchema<T>, opts?: FetchAllOptions): Promise<T[]>;
  fetch(endpoint: string, init?: RequestInit): Promise<Response>;
}

function buildQueryParams(
  opts: FetchOneOptions,
  page?: number,
  pageSize?: number,
): Record<string, unknown> {
  const params: Record<string, unknown> = { status: "published" };

  if (opts.locale !== undefined) params.locale = opts.locale;
  if (opts.populate !== undefined) params.populate = opts.populate;
  if (opts.filters !== undefined) params.filters = opts.filters;
  if (opts.fields !== undefined) params.fields = opts.fields;
  if (opts.sort !== undefined) params.sort = opts.sort;
  if (page !== undefined && pageSize !== undefined) {
    params.pagination = { page, pageSize };
  }

  return params;
}

function buildUrl(baseUrl: string, endpoint: string, params: Record<string, unknown>): string {
  const url = new URL(endpoint, baseUrl);
  appendSearchParams(url.searchParams, params);
  return url.toString();
}

function appendSearchParams(
  searchParams: URLSearchParams,
  value: Record<string, unknown>,
  prefix?: string,
): void {
  for (const [key, child] of Object.entries(value)) {
    if (child === undefined || child === null) continue;
    const nextKey = prefix ? prefix + "[" + key + "]" : key;
    if (Array.isArray(child)) {
      child.forEach((item, index) => {
        const arrayKey = nextKey + "[" + index + "]";
        if (typeof item === "object" && item !== null) {
          appendSearchParams(searchParams, item as Record<string, unknown>, arrayKey);
        } else {
          searchParams.set(arrayKey, String(item));
        }
      });
    } else if (typeof child === "object") {
      appendSearchParams(searchParams, child as Record<string, unknown>, nextKey);
    } else {
      searchParams.set(nextKey, String(child));
    }
  }
}

function flattenAttributes(entity: Record<string, unknown>): Record<string, unknown> {
  const attrs = entity.attributes;
  if (attrs && typeof attrs === "object") {
    return { ...entity, ...(attrs as Record<string, unknown>) };
  }
  return entity;
}

function deepUnwrapStrapiRelations(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(deepUnwrapStrapiRelations);
  }

  if (value && typeof value === "object") {
    const obj = value as Record<string, unknown>;

    if ("data" in obj && obj.data != null) {
      const data = obj.data;

      if (Array.isArray(data)) {
        return data.map((item: unknown) => {
          if (item && typeof item === "object") {
            return deepUnwrapStrapiRelations(flattenAttributes(item as Record<string, unknown>));
          }
          return item;
        });
      }

      if (typeof data === "object") {
        return deepUnwrapStrapiRelations(flattenAttributes(data as Record<string, unknown>));
      }
    }

    const result: Record<string, unknown> = {};
    for (const [key, val] of Object.entries(obj)) {
      result[key] = deepUnwrapStrapiRelations(val);
    }
    return result;
  }

  return value;
}

function normalizeEntity<T extends Record<string, unknown>>(entity: T): T {
  return deepUnwrapStrapiRelations(flattenAttributes(entity)) as T;
}

function unwrapStrapiData(data: unknown): unknown {
  if (Array.isArray(data)) {
    return data.map((item) => {
      if (item && typeof item === "object") {
        return normalizeEntity(item as Record<string, unknown>);
      }
      return item;
    });
  }
  if (data && typeof data === "object") {
    return normalizeEntity(data as Record<string, unknown>);
  }
  return data;
}

function extractPageMeta(json: unknown): { pageCount?: number } {
  if (json && typeof json === "object" && "meta" in json) {
    const meta = (json as Record<string, unknown>).meta;
    if (meta && typeof meta === "object") {
      const pagination = (meta as Record<string, unknown>).pagination;
      if (pagination && typeof pagination === "object") {
        return {
          pageCount: (pagination as Record<string, unknown>).pageCount as number | undefined,
        };
      }
    }
  }
  return {};
}

function extractDataArray(json: unknown): unknown[] {
  if (json && typeof json === "object" && "data" in json) {
    const data = (json as Record<string, unknown>).data;
    if (Array.isArray(data)) {
      return data;
    }
  }
  return [];
}

export function createCmsGateway(config: CmsGatewayConfig): CmsGateway {
  const baseUrl = config.baseUrl.replace(/\/+$/, "");
  const token = config.token;
  const fetchFn = config.fetchFn ?? globalThis.fetch;
  const timeoutMs = config.timeoutMs ?? 10000;
  const maxRetries = config.maxRetries ?? 3;
  const retryBaseDelayMs = config.retryBaseDelayMs ?? 500;
  const cache = config.cache ?? {};

  async function request(
    endpoint: string,
    params: Record<string, unknown>,
    cacheTags?: string[],
    signal?: AbortSignal,
  ): Promise<unknown> {
    const url = buildUrl(baseUrl, endpoint, params);

    const headers: Record<string, string> = { Accept: "application/json" };
    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    let lastError: unknown;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      if (attempt > 0) {
        const delay = retryBaseDelayMs * Math.pow(2, attempt - 1);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }

      let fetchInit: RequestInit = {
        headers,
        signal: signal ?? AbortSignal.timeout(timeoutMs),
      };

      if (cache.fetchInit && cacheTags && cacheTags.length > 0) {
        fetchInit = { ...fetchInit, ...cache.fetchInit(cacheTags) };
      }

      try {
        const response = await fetchFn(url, fetchInit);

        if (!response.ok) {
          throw new CmsError(
            response.status === 404 ? "not_found" : "server_error",
            "Strapi request failed: " +
              response.status +
              " " +
              response.statusText +
              " " +
              endpoint,
            { status: response.status, url },
          );
        }

        return response.json();
      } catch (error) {
        lastError = error;

        if (error instanceof CmsError && error.kind !== "network" && error.kind !== "timeout") {
          throw error;
        }

        if (attempt === maxRetries) {
          if (error instanceof CmsError) throw error;
          const isTimeout = error instanceof DOMException && error.name === "TimeoutError";
          throw new CmsError(
            isTimeout ? "timeout" : "network",
            isTimeout
              ? "Request to " + endpoint + " timed out after " + timeoutMs + "ms."
              : "Failed to connect to CMS at " + baseUrl + ".",
            { url, cause: error instanceof Error ? error : undefined },
          );
        }
      }
    }

    throw lastError;
  }

  const fetchOneImpl = async <T>(
    endpoint: string,
    schema: ZodSchema<T>,
    opts?: FetchOneOptions,
  ): Promise<T | null> => {
    const params = buildQueryParams(opts ?? {});
    const json = await request(endpoint, params, opts?.cacheTags, opts?.signal);

    if (json && typeof json === "object" && "data" in json) {
      const obj = json as Record<string, unknown>;
      obj.data = unwrapStrapiData(obj.data);
    }

    const parsed = schema.safeParse(json);
    if (!parsed.success) {
      throw new CmsError("validation", "Strapi response failed validation", {
        url: buildUrl(baseUrl, endpoint, params),
        issues: parsed.error.issues.map((i) => ({
          path: i.path as unknown as (string | number)[],
          message: i.message,
        })),
        raw: json,
      });
    }

    return parsed.data ?? null;
  };

  const fetchAllImpl = async <T>(
    endpoint: string,
    entitySchema: ZodSchema<T>,
    opts?: FetchAllOptions,
  ): Promise<T[]> => {
    const pageSize = opts?.pageSize ?? 100;
    const maxPages = opts?.maxPages ?? 100;
    const allEntities: unknown[] = [];

    for (let page = 1; page <= maxPages; page++) {
      const pageParams = buildQueryParams(opts ?? {}, page, pageSize);
      const json = await request(endpoint, pageParams, opts?.cacheTags, opts?.signal);

      const dataArray = extractDataArray(json);
      const unwrappedItems = unwrapStrapiData(dataArray);
      const items = Array.isArray(unwrappedItems) ? unwrappedItems : [];
      allEntities.push(...items);

      const { pageCount } = extractPageMeta(json);
      if (pageCount !== undefined && page >= pageCount) {
        break;
      }

      if (items.length < pageSize) {
        break;
      }
    }

    const arraySchema = z.array(entitySchema);
    const parsed = arraySchema.safeParse(allEntities);
    if (!parsed.success) {
      throw new CmsError("validation", "Strapi response failed validation", {
        url: buildUrl(baseUrl, endpoint, buildQueryParams(opts ?? {})),
        issues: parsed.error.issues.map((i) => ({
          path: i.path as unknown as (string | number)[],
          message: i.message,
        })),
        raw: allEntities,
      });
    }

    return parsed.data as T[];
  };

  const fetchImpl = async (endpoint: string, init?: RequestInit): Promise<Response> => {
    const url = buildUrl(baseUrl, endpoint, {});
    const headers: Record<string, string> = { Accept: "application/json" };

    if (init?.headers) {
      const initHeaders = init.headers;
      if (!Array.isArray(initHeaders) && typeof initHeaders === "object") {
        Object.assign(headers, initHeaders);
      }
    }

    if (token) {
      headers.Authorization = "Bearer " + token;
    }

    return fetchFn(url, { ...init, headers });
  };

  const zodPageEntity = z
    .object({
      id: z.number().optional(),
      documentId: z.string(),
      locale: z.enum(["el", "ru"]),
      slug: z.string(),
      title: z.string(),
      menuTitle: z.string().nullish(),
      pageType: z.string(),
      layoutVariant: z.string(),
    })
    .passthrough();

  const pagesImpl = {
    all: async (opts?: FetchAllOptions): Promise<PageDTO[]> => {
      const entities = await fetchAllImpl("/api/pages", zodPageEntity, opts);
      return entities.map((e) => toPageDTO(e as unknown as StrapiPagePayload));
    },
    one: async (slug: string, opts?: FetchOneOptions): Promise<PageDTO | null> => {
      const slugFilter: Record<string, unknown> = { $eq: slug };
      const mergedFilters = opts?.filters
        ? { slug: slugFilter, ...opts.filters }
        : { slug: slugFilter };
      return fetchOneImpl("/api/pages", pageResponseSchema, {
        ...opts,
        filters: mergedFilters,
      });
    },
  };

  const gateway: CmsGateway = {
    pages: pagesImpl,
    fetchOne: fetchOneImpl,
    fetchAll: fetchAllImpl,
    fetch: fetchImpl,
  };

  if (cache.dedupe) {
    gateway.fetchOne = cache.dedupe(
      gateway.fetchOne as (...args: unknown[]) => unknown,
    ) as typeof gateway.fetchOne;
    gateway.fetchAll = cache.dedupe(
      gateway.fetchAll as (...args: unknown[]) => unknown,
    ) as typeof gateway.fetchAll;
    gateway.fetch = cache.dedupe(
      gateway.fetch as (...args: unknown[]) => unknown,
    ) as typeof gateway.fetch;
    gateway.pages.all = cache.dedupe(
      gateway.pages.all as (...args: unknown[]) => unknown,
    ) as typeof gateway.pages.all;
    gateway.pages.one = cache.dedupe(
      gateway.pages.one as (...args: unknown[]) => unknown,
    ) as typeof gateway.pages.one;
  }

  return gateway;
}
