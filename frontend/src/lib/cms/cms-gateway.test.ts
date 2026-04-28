import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { z } from "zod";
import {
  createCmsGateway,
  type CmsGateway,
  type FetchAllOptions,
  type FetchOneOptions,
} from "./cms-gateway";
import { CmsError } from "./errors";

const FIXTURES_DIR = path.resolve(__dirname, "__tests__", "__fixtures__");

function loadFixture(filename: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, filename), "utf-8"));
}

const testEntitySchema = z.object({
  id: z.number().optional(),
  documentId: z.string(),
  slug: z.string(),
  title: z.string(),
});

const testSingleResponseSchema = z
  .object({
    data: z.array(testEntitySchema),
    meta: z.unknown().optional(),
  })
  .transform((r) => r.data[0] ?? null);

function mockStrapiEntity(overrides?: Record<string, unknown>) {
  return {
    id: 1,
    documentId: "abc123",
    attributes: { slug: "about", title: "About Us", ...overrides },
  };
}

function strapiListResponse(items: unknown[], meta?: unknown) {
  return {
    data: items,
    meta: meta ?? { pagination: { page: 1, pageSize: 100, pageCount: 1, total: items.length } },
  };
}

function mockFetchResponse(data: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => data,
  } as Response;
}

function createTestGateway(
  mockFn: typeof globalThis.fetch = vi.fn() as unknown as typeof globalThis.fetch,
): CmsGateway {
  return createCmsGateway({
    baseUrl: "http://localhost:1337",
    token: "test-token",
    fetchFn: mockFn,
    timeoutMs: 5000,
    maxRetries: 0,
  });
}

describe("createCmsGateway", () => {
  it("returns a gateway instance with all methods", () => {
    const gateway = createTestGateway();
    expect(gateway).toBeDefined();
    expect(typeof gateway.fetchOne).toBe("function");
    expect(typeof gateway.fetchAll).toBe("function");
    expect(typeof gateway.fetch).toBe("function");
  });
});

describe("fetchOne", () => {
  it("returns validated single result", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockFetchResponse(strapiListResponse([mockStrapiEntity()])));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const result = await gateway.fetchOne("/api/pages", testSingleResponseSchema, {
      locale: "el",
    });

    expect(result).not.toBeNull();
    expect(result).toEqual({
      id: 1,
      documentId: "abc123",
      slug: "about",
      title: "About Us",
    });
  });

  it("returns null when response data is empty", async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(strapiListResponse([])));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const result = await gateway.fetchOne("/api/pages", testSingleResponseSchema, {
      locale: "el",
    });

    expect(result).toBeNull();
  });

  it("throws CmsError('validation') on schema mismatch", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockFetchResponse(strapiListResponse([mockStrapiEntity({ slug: 123 })])));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    await expect(
      gateway.fetchOne("/api/pages", testSingleResponseSchema, { locale: "el" }),
    ).rejects.toThrow(CmsError);

    try {
      await gateway.fetchOne("/api/pages", testSingleResponseSchema, { locale: "el" });
    } catch (error) {
      expect(error).toBeInstanceOf(CmsError);
      const cmsError = error as CmsError;
      expect(cmsError.kind).toBe("validation");
      expect(cmsError.url).toContain("/api/pages");
      expect(cmsError.issues).toBeDefined();
      expect(cmsError.issues!.length).toBeGreaterThan(0);
    }
  });

  it("throws CmsError('network') on connection failure", async () => {
    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    await expect(
      gateway.fetchOne("/api/pages", testSingleResponseSchema, { locale: "el" }),
    ).rejects.toThrow(CmsError);

    try {
      await gateway.fetchOne("/api/pages", testSingleResponseSchema, { locale: "el" });
    } catch (error) {
      expect(error).toBeInstanceOf(CmsError);
      const cmsError = error as CmsError;
      expect(cmsError.kind).toBe("network");
    }
  });

  it("throws CmsError('timeout') on abort", async () => {
    const abortError = new DOMException("The operation was aborted", "TimeoutError");
    const mockFetch = vi.fn().mockRejectedValue(abortError);
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    try {
      await gateway.fetchOne("/api/pages", testSingleResponseSchema, { locale: "el" });
    } catch (error) {
      expect(error).toBeInstanceOf(CmsError);
      const cmsError = error as CmsError;
      expect(cmsError.kind).toBe("timeout");
    }
  });

  it("throws CmsError('server_error') on 500 response", async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(null, 500));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    try {
      await gateway.fetchOne("/api/pages", testSingleResponseSchema, { locale: "el" });
    } catch (error) {
      expect(error).toBeInstanceOf(CmsError);
      const cmsError = error as CmsError;
      expect(cmsError.kind).toBe("server_error");
      expect(cmsError.status).toBe(500);
    }
  });

  it("injects Authorization header", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockFetchResponse(strapiListResponse([mockStrapiEntity()])));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    await gateway.fetchOne("/api/pages", testSingleResponseSchema, { locale: "el" });

    const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = fetchCall[1].headers as Record<string, string>;
    expect(headers.Authorization).toBe("Bearer test-token");
  });

  it("does not inject auth header when token is undefined", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockFetchResponse(strapiListResponse([mockStrapiEntity()])));
    const gateway = createCmsGateway({
      baseUrl: "http://localhost:1337",
      fetchFn: mockFetch as unknown as typeof globalThis.fetch,
    });

    await gateway.fetchOne("/api/pages", testSingleResponseSchema, { locale: "el" });

    const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
    const headers = fetchCall[1].headers as Record<string, string>;
    expect(headers.Authorization).toBeUndefined();
  });
});

describe("fetchAll", () => {
  it("returns all results from a single page", async () => {
    const entities = [
      mockStrapiEntity({ slug: "page-1", title: "Page 1" }),
      mockStrapiEntity({ slug: "page-2", title: "Page 2" }),
    ];
    const mockFetch = vi.fn().mockResolvedValue(
      mockFetchResponse(
        strapiListResponse(entities, {
          pagination: { page: 1, pageSize: 100, pageCount: 1, total: 2 },
        }),
      ),
    );
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const results = await gateway.fetchAll("/api/pages", testEntitySchema, {
      locale: "el",
    });

    expect(results).toHaveLength(2);
    expect(results[0]!.slug).toBe("page-1");
    expect(results[1]!.slug).toBe("page-2");
  });

  it("auto-paginates across multiple pages", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValueOnce(
        mockFetchResponse(
          strapiListResponse([mockStrapiEntity({ slug: "a" })], {
            pagination: { page: 1, pageSize: 1, pageCount: 3, total: 3 },
          }),
        ),
      )
      .mockResolvedValueOnce(
        mockFetchResponse(
          strapiListResponse([mockStrapiEntity({ slug: "b" })], {
            pagination: { page: 2, pageSize: 1, pageCount: 3, total: 3 },
          }),
        ),
      )
      .mockResolvedValueOnce(
        mockFetchResponse(
          strapiListResponse([mockStrapiEntity({ slug: "c" })], {
            pagination: { page: 3, pageSize: 1, pageCount: 3, total: 3 },
          }),
        ),
      );
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const results = await gateway.fetchAll("/api/pages", testEntitySchema, {
      pageSize: 1,
    });

    const allEntities = results;
    expect(allEntities).toHaveLength(3);
    expect(allEntities.map((r) => r.slug)).toEqual(["a", "b", "c"]);
  });

  it("stops pagination at maxPages", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockFetchResponse(
        strapiListResponse([mockStrapiEntity({ slug: "x" })], {
          pagination: { page: 1, pageSize: 1, pageCount: 100, total: 100 },
        }),
      ),
    );
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const results = await gateway.fetchAll("/api/pages", testEntitySchema, {
      pageSize: 1,
      maxPages: 2,
    });

    expect(results).toHaveLength(2);
    expect(mockFetch).toHaveBeenCalledTimes(2);
  });

  it("stops when batch smaller than pageSize", async () => {
    const mockFetch = vi.fn().mockResolvedValue(
      mockFetchResponse(
        strapiListResponse([mockStrapiEntity({ slug: "only" })], {
          pagination: { page: 1, pageSize: 100, pageCount: 1, total: 1 },
        }),
      ),
    );
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const results = await gateway.fetchAll("/api/pages", testEntitySchema);

    expect(results).toHaveLength(1);
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});

describe("fetch", () => {
  it("returns raw Response without validation", async () => {
    const responseData = { status: "ok" };
    const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(responseData));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const response = await gateway.fetch("/api/health");

    expect(response).toBeDefined();
    expect(response.ok).toBe(true);
    const json = await response.json();
    expect(json).toEqual(responseData);
  });
});

describe("Strapi envelope unwrap", () => {
  it("unwraps { id, attributes } entities before validation", async () => {
    const schemas = z.object({
      documentId: z.string(),
      slug: z.string(),
      title: z.string(),
    });

    const singleSchema = z
      .object({ data: z.array(schemas), meta: z.unknown().optional() })
      .transform((r) => r.data[0] ?? null);

    const mockFetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        data: [{ id: 1, documentId: "abc", attributes: { slug: "about", title: "About" } }],
        meta: {},
      }),
    );
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const result = await gateway.fetchOne("/api/pages", singleSchema, { locale: "el" });

    expect(result).toEqual({ documentId: "abc", slug: "about", title: "About" });
  });

  it("passes through entities without attributes wrapper", async () => {
    const schemas = z.object({
      documentId: z.string(),
      slug: z.string(),
    });

    const singleSchema = z
      .object({ data: z.array(schemas), meta: z.unknown().optional() })
      .transform((r) => r.data[0] ?? null);

    const mockFetch = vi.fn().mockResolvedValue(
      mockFetchResponse({
        data: [{ documentId: "abc", slug: "direct" }],
        meta: {},
      }),
    );
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const result = await gateway.fetchOne("/api/pages", singleSchema, { locale: "el" });

    expect(result).toEqual({ documentId: "abc", slug: "direct" });
  });
});

describe("fetchOne cache integration", () => {
  it("calls cache.fetchInit when cacheTags provided", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockFetchResponse(strapiListResponse([mockStrapiEntity()])));
    const fetchInitMock = vi.fn().mockReturnValue({ next: { revalidate: 300, tags: ["a"] } });
    const gateway = createCmsGateway({
      baseUrl: "http://localhost:1337",
      fetchFn: mockFetch as unknown as typeof globalThis.fetch,
      cache: { fetchInit: fetchInitMock },
    });

    await gateway.fetchOne("/api/pages", testSingleResponseSchema, {
      locale: "el",
      cacheTags: ["navigation:el", "pages"],
    });

    expect(fetchInitMock).toHaveBeenCalledWith(["navigation:el", "pages"]);
    const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(fetchCall[1].next).toBeDefined();
  });

  it("does not call cache.fetchInit when no cacheTags", async () => {
    const mockFetch = vi
      .fn()
      .mockResolvedValue(mockFetchResponse(strapiListResponse([mockStrapiEntity()])));
    const fetchInitMock = vi.fn();
    const gateway = createCmsGateway({
      baseUrl: "http://localhost:1337",
      fetchFn: mockFetch as unknown as typeof globalThis.fetch,
      cache: { fetchInit: fetchInitMock },
    });

    await gateway.fetchOne("/api/pages", testSingleResponseSchema, { locale: "el" });

    expect(fetchInitMock).not.toHaveBeenCalled();
  });
});

describe("CmsError structure", () => {
  it("has correct kind, status, url fields", () => {
    const error = new CmsError("network", "Connection failed", {
      url: "http://localhost:1337/api/pages",
      status: 500,
    });

    expect(error).toBeInstanceOf(Error);
    expect(error).toBeInstanceOf(CmsError);
    expect(error.kind).toBe("network");
    expect(error.message).toContain("[CMS]");
    expect(error.message).toContain("Connection failed");
    expect(error.url).toBe("http://localhost:1337/api/pages");
    expect(error.status).toBe(500);
  });

  it("supports issues array for validation errors", () => {
    const error = new CmsError("validation", "Schema mismatch", {
      url: "http://localhost:1337/api/pages",
      issues: [{ path: ["data", 0, "slug"], message: "Expected string, got number" }],
      raw: { data: [{ slug: 123 }] },
    });

    expect(error.kind).toBe("validation");
    expect(error.issues).toHaveLength(1);
    expect(error.issues![0]!.message).toContain("Expected string");
    expect(error.raw).toEqual({ data: [{ slug: 123 }] });
  });

  it("backward-compat type alias equals kind", () => {
    const error = new CmsError("timeout", "Timed out", {
      url: "http://localhost:1337/api/pages",
    });

    expect(error.type).toBe("timeout");
  });
});

describe("isTimeoutError backward compat", () => {
  it("works with new CmsError", async () => {
    const { isTimeoutError } = await import("./errors");

    const timeoutError = new CmsError("timeout", "Request timed out", {
      url: "http://localhost:1337/api/pages",
    });
    const networkError = new CmsError("network", "Connection failed", {
      url: "http://localhost:1337/api/pages",
    });

    expect(isTimeoutError(timeoutError)).toBe(true);
    expect(isTimeoutError(networkError)).toBe(true);
  });
});

describe("pages.all", () => {
  beforeEach(() => {
    vi.stubEnv("STRAPI_URL", "http://localhost:1337");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns PageDTO[] from a fixture", async () => {
    const fixture = loadFixture("navigation-pages.json");
    const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(fixture));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const pages = await gateway.pages.all({ locale: "el" });

    expect(pages).toBeInstanceOf(Array);
    expect(pages.length).toBeGreaterThan(0);
    const first = pages[0]!;
    expect(first.documentId).toBe("home123");
    expect(first.slug).toBe("index");
    expect(first.title).toBe("Home");
    expect(first.navLabel).toBe("Home");
    expect(first.locale).toBe("el");
  });

  it("passes sort options through to query params", async () => {
    const fixture = loadFixture("navigation-pages.json");
    const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(fixture));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    await gateway.pages.all({ sort: ["slug:asc"], fields: ["slug"] });

    const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(fetchCall[0]).toContain("sort%5B0%5D=slug%3Aasc");
    expect(fetchCall[0]).toContain("fields%5B0%5D=slug");
  });

  it("passes populate options through to Strapi query params", async () => {
    const fixture = loadFixture("navigation-pages.json");
    const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(fixture));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    await gateway.pages.all({
      locale: "el",
      populate: { parentPage: { fields: ["documentId", "slug", "title"] } },
    });

    const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(fetchCall[0]).toContain("populate");
    expect(fetchCall[0]).toContain("parentPage");
  });
});

describe("pages.one", () => {
  beforeEach(() => {
    vi.stubEnv("STRAPI_URL", "http://localhost:1337");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns PageDTO for existing slug", async () => {
    const fixture = loadFixture("content-page.json");
    const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse(fixture));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const page = await gateway.pages.one("about", { locale: "el" });

    expect(page).not.toBeNull();
    expect(page!.documentId).toBe("abc123xy");
    expect(page!.slug).toBe("about");
    expect(page!.title).toBe("About Us");
    expect(page!.navLabel).toBe("About");
    expect(page!.locale).toBe("el");
    expect(page!.pageType).toBe("content");
    expect(page!.seo.metaTitle).toBe("About Us | Clinic");
    expect(page!.seo.sitemapPriority).toBe(0.8);
    expect(page!.tags).toHaveLength(1);
    expect(page!.tags[0]!.name).toBe("General");
    expect(page!.parentPage).toEqual({
      documentId: "home123",
      slug: "index",
      title: "Home",
    });
  });

  it("passes populate options through to Strapi query params", async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ data: [], meta: {} }));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    await gateway.pages.one("about", {
      locale: "el",
      populate: { pageSections: { populate: "*" } },
    });

    const fetchCall = mockFetch.mock.calls[0] as [string, RequestInit];
    expect(fetchCall[0]).toContain("populate");
    expect(fetchCall[0]).toContain("pageSections");
  });

  it("returns null when page not found", async () => {
    const mockFetch = vi.fn().mockResolvedValue(mockFetchResponse({ data: [], meta: {} }));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);

    const page = await gateway.pages.one("nonexistent", { locale: "el" });

    expect(page).toBeNull();
  });
});
