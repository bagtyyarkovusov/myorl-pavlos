import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";

import type { CmsConfig } from "./env";
import {
  PAGE_POPULATE,
  isFrontendNativeSystemLayout,
  pageListSchema,
  pageResponseSchema,
  toPageDTO,
} from "./page-normalizer";
import type { StrapiPagePayload } from "./types";

const FIXTURES_DIR = path.resolve(__dirname, "__tests__/__fixtures__");

function loadFixture(filename: string): Record<string, unknown> {
  return JSON.parse(readFileSync(path.join(FIXTURES_DIR, filename), "utf-8")) as Record<
    string,
    unknown
  >;
}

function flattenEntity(response: Record<string, unknown>): Record<string, unknown> {
  const data = (response.data as Array<Record<string, unknown>>)?.[0];
  if (!data) return {};
  const { attributes, ...rest } = data;
  if (attributes && typeof attributes === "object") {
    return { ...rest, ...(attributes as Record<string, unknown>) };
  }
  return rest;
}

function flattenEntities(response: Record<string, unknown>): Array<Record<string, unknown>> {
  const data = response.data as Array<Record<string, unknown>> | undefined;
  if (!data) return [];
  return data.map((entity) => {
    const { attributes, ...rest } = entity;
    if (attributes && typeof attributes === "object") {
      return { ...rest, ...(attributes as Record<string, unknown>) };
    }
    return rest;
  });
}

const mockConfig: CmsConfig = {
  strapiUrl: "http://localhost:1337",
  strapiToken: undefined,
  siteUrl: "https://example.com",
  revalidateSecret: undefined,
};

describe("PAGE_POPULATE", () => {
  it("has the expected Strapi populate shape", () => {
    expect(PAGE_POPULATE).toHaveProperty("seo");
    expect(PAGE_POPULATE).toHaveProperty("parentPage");
    expect(PAGE_POPULATE).toHaveProperty("localizations");
    expect(PAGE_POPULATE).toHaveProperty("tags");
    expect(PAGE_POPULATE).toHaveProperty("pageSections");
    expect(PAGE_POPULATE).toHaveProperty("contactSection");
    expect(PAGE_POPULATE).toHaveProperty("gallerySection");
    expect(PAGE_POPULATE.contactSection).toEqual({ populate: { details: true, clinics: true } });
  });
});

describe("isFrontendNativeSystemLayout", () => {
  it("returns true for not-found, search-results, sitemap", () => {
    expect(isFrontendNativeSystemLayout("not-found")).toBe(true);
    expect(isFrontendNativeSystemLayout("search-results")).toBe(true);
    expect(isFrontendNativeSystemLayout("sitemap")).toBe(true);
  });

  it("returns false for other variants", () => {
    expect(isFrontendNativeSystemLayout("standard")).toBe(false);
    expect(isFrontendNativeSystemLayout("home")).toBe(false);
  });
});

describe("toPageDTO", () => {
  let contentPayload: StrapiPagePayload;

  beforeEach(() => {
    vi.stubEnv("STRAPI_URL", "http://localhost:1337");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  beforeAll(() => {
    const fixture = loadFixture("content-page.json");
    contentPayload = flattenEntity(fixture) as unknown as StrapiPagePayload;
  });

  it("returns a fully populated PageDTO", () => {
    const dto = toPageDTO(contentPayload);

    expect(dto.documentId).toBe("abc123xy");
    expect(dto.locale).toBe("el");
    expect(dto.slug).toBe("about");
    expect(dto.title).toBe("About Us");
    expect(dto.navLabel).toBe("About");
    expect(dto.pageType).toBe("content");
    expect(dto.layoutVariant).toBe("standard");
    expect(dto.renderMode).toBe("cms");
  });

  it("coerces booleans and numbers", () => {
    const dto = toPageDTO(contentPayload);

    expect(dto.isFolder).toBe(false);
    expect(dto.hideFromMenu).toBe(false);
    expect(dto.menuIndex).toBe(3);
    expect(typeof dto.isFolder).toBe("boolean");
    expect(typeof dto.hideFromMenu).toBe("boolean");
    expect(typeof dto.menuIndex).toBe("number");
  });

  it("populates sections array (never empty/undefined)", () => {
    const dto = toPageDTO(contentPayload);

    expect(dto.sections).toBeDefined();
    expect(Array.isArray(dto.sections)).toBe(true);
  });

  it("populates contact (from contactSection)", () => {
    const contactPayload: StrapiPagePayload = {
      ...contentPayload,
      contactSection: {
        heading: "Contact",
        details: [{ type: "Phone", value: "<p>123</p>" }],
        clinics: [{ name: "Main", address: "<p>123 St</p>", phone: "555", email: "a@b.com" }],
      },
    };

    const dto = toPageDTO(contactPayload);

    expect(dto.contact).toBeDefined();
    expect(dto.contact?.details).toHaveLength(1);
    expect(dto.contact?.clinics).toHaveLength(1);
    if (dto.contact) {
      expect(dto.contact.details[0]!.type).toBe("Phone");
      expect(dto.contact.clinics[0]!.name).toBe("Main");
    }
  });

  it("returns contact undefined when contactSection is missing", () => {
    const noContactPayload: StrapiPagePayload = {
      ...contentPayload,
      contactSection: undefined,
    };

    const dto = toPageDTO(noContactPayload);

    expect(dto.contact).toBeUndefined();
  });

  it("populates seo fields correctly", () => {
    const dto = toPageDTO(contentPayload);

    expect(dto.seo.metaTitle).toBe("About Us | Clinic");
    expect(dto.seo.metaDescription).toBe("Learn about our dental clinic");
    expect(dto.seo.robotsNoindex).toBe(false);
    expect(dto.seo.sitemapExclude).toBe(false);
    expect(dto.seo.sitemapPriority).toBe(0.8);
    expect(dto.seo.sitemapChangeFrequency).toBe("monthly");
    expect(dto.seoTitle).toBe("About Us | Clinic");
  });

  it("maps tags correctly", () => {
    const dto = toPageDTO(contentPayload);

    expect(dto.tags).toHaveLength(1);
    expect(dto.tags[0]!.name).toBe("General");
    expect(dto.tags[0]!.slug).toBe("general");
  });

  it("maps parentPage reference correctly", () => {
    const dto = toPageDTO(contentPayload);

    expect(dto.parentPage).toEqual({
      documentId: "home123",
      slug: "index",
      title: "Home",
    });
  });

  it("produces absolute alternateUrls by default via getCmsConfig fallback", () => {
    const dto = toPageDTO(contentPayload);

    expect(dto.alternateUrls).toHaveProperty("el");
    expect(dto.alternateUrls).toHaveProperty("ru");
    expect(dto.alternateUrls["el"]).toBe("http://localhost:3000/el/about");
    expect(dto.alternateUrls["ru"]).toBe("http://localhost:3000/ru/o-nas");
  });

  it("produces absolute alternateUrls when config is provided", () => {
    const dto = toPageDTO(contentPayload, mockConfig);

    expect(dto.alternateUrls["el"]).toBe("https://example.com/el/about");
    expect(dto.alternateUrls["ru"]).toBe("https://example.com/ru/o-nas");
  });

  it("sets frontend-native renderMode for system pages with recognized layout", () => {
    const systemPayload: StrapiPagePayload = {
      ...contentPayload,
      pageType: "system",
      layoutVariant: "not-found",
    };

    const dto = toPageDTO(systemPayload);

    expect(dto.renderMode).toBe("frontend-native");
  });

  it("renders null featuredImage when media has no url", () => {
    const noImagePayload: StrapiPagePayload = {
      ...contentPayload,
      featuredImage: null,
    };

    const dto = toPageDTO(noImagePayload);

    expect(dto.featuredImage).toBeNull();
  });

  it("defaults menuIndex to 0 when null", () => {
    const missingIndexPayload: StrapiPagePayload = {
      ...contentPayload,
      menuIndex: null,
    };

    const dto = toPageDTO(missingIndexPayload);

    expect(dto.menuIndex).toBe(0);
  });

  it("defaults seoTitle to title when metaTitle is null", () => {
    const noSeoTitlePayload: StrapiPagePayload = {
      ...contentPayload,
      seo: { ...(contentPayload.seo ?? {}), metaTitle: null },
    };

    const dto = toPageDTO(noSeoTitlePayload);

    expect(dto.seoTitle).toBe("About Us");
  });
});

describe("pageResponseSchema", () => {
  beforeEach(() => {
    vi.stubEnv("STRAPI_URL", "http://localhost:1337");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns a fully populated PageDTO from content-page fixture", () => {
    const fixture = loadFixture("content-page.json");
    const dto = pageResponseSchema.parse(fixture);

    expect(dto).not.toBeNull();
    if (!dto) throw new Error("Expected non-null PageDTO");

    expect(dto.documentId).toBe("abc123xy");
    expect(dto.locale).toBe("el");
    expect(dto.slug).toBe("about");
    expect(dto.sections).toBeDefined();
    expect(Array.isArray(dto.sections)).toBe(true);
    expect(dto.alternateUrls).toHaveProperty("el");
    expect(dto.alternateUrls).toHaveProperty("ru");
  });

  it("returns null when data array is empty", () => {
    const dto = pageResponseSchema.parse({ data: [], meta: {} });
    expect(dto).toBeNull();
  });

  it("rejects a response with invalid locale", () => {
    const badFixture = {
      data: [{ documentId: "x", locale: "fr", attributes: { slug: "x", title: "X" } }],
      meta: {},
    };

    expect(() => pageResponseSchema.parse(badFixture)).toThrow();
  });
});

describe("pageListSchema", () => {
  beforeEach(() => {
    vi.stubEnv("STRAPI_URL", "http://localhost:1337");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns array of PageDTO from navigation-pages fixture", () => {
    const fixture = loadFixture("navigation-pages.json");
    const dtos = pageListSchema.parse(fixture);

    expect(Array.isArray(dtos)).toBe(true);
    expect(dtos).toHaveLength(2);
    expect(dtos[0]!.documentId).toBe("home123");
    expect(dtos[0]!.slug).toBe("index");
    expect(dtos[1]!.documentId).toBe("about123");
    expect(dtos[1]!.slug).toBe("about");

    for (const dto of dtos) {
      expect(dto.sections).toBeDefined();
      expect(Array.isArray(dto.sections)).toBe(true);
    }
  });

  it("returns empty array when data is empty", () => {
    const dtos = pageListSchema.parse({ data: [], meta: {} });
    expect(dtos).toEqual([]);
  });
});

describe("parity — page schemas and toPageDTO produce consistent output", () => {
  beforeEach(() => {
    vi.stubEnv("STRAPI_URL", "http://localhost:1337");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("pageResponseSchema and toPageDTO agree on core fields for content-page", () => {
    const fixture = loadFixture("content-page.json");
    const payload = flattenEntity(fixture) as unknown as StrapiPagePayload;

    const fromDTO = toPageDTO(payload);
    const fromSchema = pageResponseSchema.parse(fixture);

    if (!fromSchema) throw new Error("Schema returned null");

    expect(fromSchema.documentId).toBe(fromDTO.documentId);
    expect(fromSchema.locale).toBe(fromDTO.locale);
    expect(fromSchema.slug).toBe(fromDTO.slug);
    expect(fromSchema.title).toBe(fromDTO.title);
    expect(fromSchema.navLabel).toBe(fromDTO.navLabel);
    expect(fromSchema.pageType).toBe(fromDTO.pageType);
    expect(fromSchema.layoutVariant).toBe(fromDTO.layoutVariant);
    expect(fromSchema.renderMode).toBe(fromDTO.renderMode);
    expect(fromSchema.isFolder).toBe(fromDTO.isFolder);
    expect(fromSchema.hideFromMenu).toBe(fromDTO.hideFromMenu);
    expect(fromSchema.menuIndex).toBe(fromDTO.menuIndex);
    expect(fromSchema.seoTitle).toBe(fromDTO.seoTitle);
  });

  it("pageListSchema and toPageDTO agree on core fields for navigation-pages", () => {
    const fixture = loadFixture("navigation-pages.json");
    const payloads = flattenEntities(fixture) as unknown as StrapiPagePayload[];

    const fromDTOs = payloads.map((p) => toPageDTO(p));
    const fromSchema = pageListSchema.parse(fixture);

    expect(fromDTOs).toHaveLength(fromSchema.length);
    for (let i = 0; i < fromDTOs.length; i++) {
      expect(fromDTOs[i]!.documentId).toBe(fromSchema[i]!.documentId);
      expect(fromDTOs[i]!.slug).toBe(fromSchema[i]!.slug);
      expect(fromDTOs[i]!.title).toBe(fromSchema[i]!.title);
      expect(fromDTOs[i]!.navLabel).toBe(fromSchema[i]!.navLabel);
    }
  });
});

describe("parity — new toPageDTO matches sitemap expectations", () => {
  beforeEach(() => {
    vi.stubEnv("STRAPI_URL", "http://localhost:1337");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("filters sitemapExclude correctly via Zod pathway", async () => {
    const fixture = loadFixture("sitemap-pages.json");
    const payloads = flattenEntities(fixture) as unknown as StrapiPagePayload[];

    const dtos = payloads.map((p) => toPageDTO(p));
    const visiblePages = dtos.filter((p) => !p.seo.sitemapExclude);

    expect(visiblePages).toHaveLength(3);
    expect(visiblePages.find((p) => p.slug === "about")).toBeUndefined();
    expect(visiblePages.find((p) => p.slug === "index")).toBeDefined();
    expect(visiblePages.find((p) => p.slug === "services")).toBeDefined();
  });
});
