import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { createCmsGateway } from "../cms-gateway";

const FIXTURES_DIR = path.resolve(__dirname, "__fixtures__");

function loadFixture(filename: string): unknown {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, filename), "utf-8"));
}

function mockStrapiResponse(data: unknown, status = 200) {
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: status === 200 ? "OK" : "Error",
    json: async () => data,
  };
}

function createTestGateway(mockFn: typeof globalThis.fetch): ReturnType<typeof createCmsGateway> {
  return createCmsGateway({
    baseUrl: "http://localhost:1337",
    fetchFn: mockFn,
  });
}

beforeEach(() => {
  vi.stubEnv("STRAPI_URL", "http://localhost:1337");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("getPageResult", () => {
  it("returns valid PageDTO from fixture JSON", async () => {
    const { getPageResult, injectCmsGatewayForTesting: inject } = await import("../cms-api");
    const fixture = loadFixture("content-page.json");

    const mockFetch = vi.fn().mockResolvedValue(mockStrapiResponse(fixture));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    const result = await getPageResult("el", "about");

    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error("Expected ok result");

    const page = result.page;
    expect(page.documentId).toBe("abc123xy");
    expect(page.locale).toBe("el");
    expect(page.slug).toBe("about");
    expect(page.title).toBe("About Us");
    expect(page.navLabel).toBe("About");
    expect(page.pageType).toBe("content");
    expect(page.layoutVariant).toBe("standard");
    expect(page.renderMode).toBe("cms");
    expect(page.menuIndex).toBe(3);
    expect(page.isFolder).toBe(false);
    expect(page.hideFromMenu).toBe(false);
    expect(page.content).toBe("<p>We are a dental clinic.</p>");
    expect(page.excerpt).toBe("About our clinic");
    expect(page.seo.metaTitle).toBe("About Us | Clinic");
    expect(page.seo.metaDescription).toBe("Learn about our dental clinic");
    expect(page.seo.robotsNoindex).toBe(false);
    expect(page.seo.sitemapExclude).toBe(false);
    expect(page.seo.sitemapPriority).toBe(0.8);
    expect(page.seo.sitemapChangeFrequency).toBe("monthly");
    expect(page.seoTitle).toBe("About Us | Clinic");
    expect(page.tags).toHaveLength(1);
    expect(page.tags[0]?.name).toBe("General");
    expect(page.parentPage).toEqual({
      documentId: "home123",
      slug: "index",
      title: "Home",
      featuredImage: null,
    });
    expect(page.alternateUrls).toHaveProperty("el");
    expect(page.alternateUrls).toHaveProperty("ru");
  });

  it("returns not_found error when page does not exist", async () => {
    const { getPageResult, injectCmsGatewayForTesting: inject } = await import("../cms-api");

    const mockFetch = vi.fn().mockResolvedValue(mockStrapiResponse({ data: [], meta: {} }));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    const result = await getPageResult("el", "nonexistent");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error result");
    expect(result.error.kind).toBe("not_found");
    if (result.error.kind === "not_found") {
      expect(result.error.locale).toBe("el");
      expect(result.error.slug).toBe("nonexistent");
    }
  });

  it("returns validation error on malformed response", async () => {
    const { getPageResult, injectCmsGatewayForTesting: inject } = await import("../cms-api");

    const mockFetch = vi.fn().mockResolvedValue(
      mockStrapiResponse({
        data: [{ documentId: "bad", locale: "el", attributes: {} }],
      }),
    );
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    const result = await getPageResult("el", "bad-page");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error result");
    expect(result.error.kind).toBe("validation");
  });

  it("returns network error on fetch failure", async () => {
    const { getPageResult, injectCmsGatewayForTesting: inject } = await import("../cms-api");

    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    const result = await getPageResult("el", "test");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error result");
    expect(result.error.kind).toBe("network");
  });

  it("returns server_error on non-ok response", async () => {
    const { getPageResult, injectCmsGatewayForTesting: inject } = await import("../cms-api");

    const mockFetch = vi.fn().mockResolvedValue(mockStrapiResponse(null, 500));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    const result = await getPageResult("el", "test");

    expect(result.ok).toBe(false);
    if (result.ok) throw new Error("Expected error result");
    expect(result.error.kind).toBe("server_error");
    expect((result.error as { status: number }).status).toBe(500);
  });
});

describe("getPage", () => {
  it("returns PageDTO from valid fixture JSON", async () => {
    const { getPage, injectCmsGatewayForTesting: inject } = await import("../cms-api");
    const fixture = loadFixture("content-page.json");

    const mockFetch = vi.fn().mockResolvedValue(mockStrapiResponse(fixture));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    const page = await getPage("el", "about");

    expect(page.documentId).toBe("abc123xy");
    expect(page.slug).toBe("about");
    expect(page.title).toBe("About Us");
  });

  it("calls notFound() when page does not exist", async () => {
    const { getPage, injectCmsGatewayForTesting: inject } = await import("../cms-api");

    const mockFetch = vi.fn().mockResolvedValue(mockStrapiResponse({ data: [], meta: {} }));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    await expect(getPage("el", "nonexistent")).rejects.toThrow();
  });

  it("throws on malformed response", async () => {
    const { getPage, injectCmsGatewayForTesting: inject } = await import("../cms-api");

    const mockFetch = vi.fn().mockResolvedValue(
      mockStrapiResponse({
        data: [{ documentId: "bad", locale: "el", attributes: {} }],
      }),
    );
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    await expect(getPage("el", "bad-page")).rejects.toThrow();
  });

  it("throws on network failure", async () => {
    const { getPage, injectCmsGatewayForTesting: inject } = await import("../cms-api");

    const mockFetch = vi.fn().mockRejectedValue(new Error("ECONNREFUSED"));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    await expect(getPage("el", "test")).rejects.toThrow();
  });
});

describe("getSite", () => {
  it("returns navigation and settings from fixtures", async () => {
    const { getSite, injectCmsGatewayForTesting: inject } = await import("../cms-api");
    const navFixture = loadFixture("navigation-pages.json");
    const globalFixture = loadFixture("global-settings.json");

    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce(mockStrapiResponse(navFixture));
    mockFetch.mockResolvedValueOnce(mockStrapiResponse(globalFixture));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    const result = await getSite("el");

    expect(result.navigation).toBeInstanceOf(Array);
    expect(result.navigation.length).toBeGreaterThan(0);
    expect(result.appointmentHref).toBe("/el/rantevou");
    expect(result.settings.address).toBe("Λεωφόρος Αλεξάνδρας 201 & Πανόρμου, Αμπελόκηποι, Αθήνα");
    expect(result.settings.phoneTel).toBe("+302110194618");
    expect(result.settings.phoneDisplay).toBe("211-01 94 618");
    expect(result.settings.email).toBe("pavlos.tsolaridis@gmail.com");
    expect(result.settings.socialLinks).toHaveLength(4);
    expect(result.settings.hours).toBe("Δευ–Παρ · 09:00 – 21:00\nΣάβ · 10:00 – 14:00");
  });

  it("reuses Greek social links when the locale entry has none", async () => {
    const { getSite, injectCmsGatewayForTesting: inject } = await import("../cms-api");
    const navFixture = loadFixture("navigation-pages.json");
    const globalRuEmptySocial = loadFixture("global-settings.json") as {
      data: { locale: string; socialLinks: unknown[] };
    };
    globalRuEmptySocial.data.locale = "ru";
    globalRuEmptySocial.data.socialLinks = [];
    const globalEl = loadFixture("global-settings.json");

    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce(mockStrapiResponse(navFixture));
    mockFetch.mockResolvedValueOnce(mockStrapiResponse(globalRuEmptySocial));
    mockFetch.mockResolvedValueOnce(mockStrapiResponse(globalEl));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    const result = await getSite("ru");

    expect(result.settings.locale).toBe("ru");
    expect(result.settings.socialLinks).toHaveLength(4);
    expect(result.settings.socialLinks[0]?.name).toBe("Facebook");
  });

  it("returns empty navigation and fallback settings when global fails", async () => {
    const { getSite, injectCmsGatewayForTesting: inject } = await import("../cms-api");

    const mockFetch = vi.fn();
    mockFetch.mockResolvedValueOnce(
      mockStrapiResponse({ data: [], meta: { pagination: { page: 1, pageSize: 100, total: 0 } } }),
    );
    mockFetch.mockRejectedValueOnce(new Error("Server down"));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    const result = await getSite("el");

    expect(result.navigation).toBeInstanceOf(Array);
    expect(result.appointmentHref).toBe("/el/rantevou");
    expect(result.settings.locale).toBe("el");
    expect(result.settings.address).toBeNull();
    expect(result.settings.phoneTel).toBeNull();
  });
});

describe("getSitemapPages", () => {
  it("returns pages filtered by sitemapExclude", async () => {
    const { getSitemapPages, injectCmsGatewayForTesting: inject } = await import("../cms-api");
    const fixture = loadFixture("sitemap-pages.json");

    const mockFetch = vi.fn().mockResolvedValue(mockStrapiResponse(fixture));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    const pages = await getSitemapPages();

    expect(pages).toHaveLength(3);
    expect(pages.find((p) => p.slug === "about")).toBeUndefined();
    expect(pages.find((p) => p.slug === "index")).toBeDefined();
    expect(pages.find((p) => p.slug === "services")).toBeDefined();
  });

  it("throws on fetch failure instead of swallowing errors", async () => {
    const { getSitemapPages, injectCmsGatewayForTesting: inject } = await import("../cms-api");

    const mockFetch = vi.fn().mockRejectedValue(new Error("Server down"));
    const gateway = createTestGateway(mockFetch as unknown as typeof globalThis.fetch);
    inject(gateway);

    await expect(getSitemapPages()).rejects.toThrow();
  });
});
