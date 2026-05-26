import { describe, expect, it, vi, beforeEach } from "vitest";

import nextConfig from "./next.config";

function match(pathname: string, source: string): boolean {
  const raw = /^:([a-zA-Z_]\w*)\((.+)\)$|^:([a-zA-Z_]\w*)$/;
  let pattern = "^";
  let i = 0;
  while (i < source.length) {
    if (source[i] === "/") {
      pattern += "\\/";
      i++;
      continue;
    }
    const rest = source.slice(i);
    const m = rest.match(raw);
    if (!m) {
      pattern += source[i]!.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      i++;
      continue;
    }
    const full = m[0];
    i += full.length;
    if (m[2]) {
      pattern += `(${m[2]})`;
    } else {
      pattern += `([^/]+)`;
    }
  }
  pattern += "$";
  return new RegExp(pattern).test(pathname);
}

describe("next.config.ts redirects – bare-slug wildcard", () => {
  const SOURCE =
    "/:slug((?!el|ru|api|admin|_next|uploads|sitemap.xml|robots.txt|favicon.ico)[^/]+)";

  it("has the wildcard rule in redirects output", async () => {
    const redirects = await nextConfig.redirects!();
    const wildcard = redirects.find((r) => r.source === SOURCE);
    expect(wildcard).toBeDefined();
    expect(wildcard!.destination).toBe("/el/:slug");
    expect(wildcard!.permanent).toBe(true);
  });

  it("matches bare slugs like /amygdales", () => {
    expect(match("/amygdales", SOURCE)).toBe(true);
    expect(match("/rinoplastiki", SOURCE)).toBe(true);
  });

  it("does NOT match locale-prefixed paths", () => {
    expect(match("/el/amygdales", SOURCE)).toBe(false);
    expect(match("/ru/amygdales", SOURCE)).toBe(false);
    expect(match("/el", SOURCE)).toBe(false);
    expect(match("/ru", SOURCE)).toBe(false);
  });

  it("does NOT match excluded prefixes", () => {
    expect(match("/api/revalidate", SOURCE)).toBe(false);
    expect(match("/api/anything", SOURCE)).toBe(false);
    expect(match("/admin", SOURCE)).toBe(false);
    expect(match("/admin/dashboard", SOURCE)).toBe(false);
    expect(match("/_next/static/chunk.js", SOURCE)).toBe(false);
    expect(match("/uploads/image.jpg", SOURCE)).toBe(false);
  });

  it("does NOT match excluded file paths", () => {
    expect(match("/sitemap.xml", SOURCE)).toBe(false);
    expect(match("/robots.txt", SOURCE)).toBe(false);
    expect(match("/favicon.ico", SOURCE)).toBe(false);
  });

  it("does NOT match root", () => {
    expect(match("/", SOURCE)).toBe(false);
  });
});

describe("next.config.ts images", () => {
  it("configures AVIF and WebP image formats", () => {
    expect(nextConfig.images).toMatchObject({
      formats: ["image/avif", "image/webp"],
    });
  });

  it("sets a minimum cache TTL for optimized images", () => {
    expect(nextConfig.images).toMatchObject({
      minimumCacheTTL: 86400,
    });
  });

  it("has remotePatterns for Strapi uploads", () => {
    const patterns = nextConfig.images?.remotePatterns ?? [];
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns[0]).toMatchObject({
      pathname: "/uploads/**",
    });
  });
});

describe("next.config.ts redirects — URL Mapping materialization", () => {
  let mockedFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockedFetch = vi.fn();
    vi.stubGlobal("fetch", mockedFetch);
    vi.stubEnv("STRAPI_URL", "http://localhost:1337");
  });

  function mockUrlMappings(
    mappings: Array<{
      legacyPath: string;
      destinationPath: string;
      destinationKind: string;
    }>,
  ) {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        data: mappings.map((m, i) => ({
          id: i + 1,
          documentId: `doc-${i}`,
          ...m,
        })),
        meta: { pagination: { total: mappings.length } },
      }),
    });
  }

  it("materializes internal-301 URL mappings as permanent redirects", async () => {
    mockUrlMappings([
      {
        legacyPath: "/old-page",
        destinationPath: "/el/new-page",
        destinationKind: "internal-301",
      },
    ]);

    const redirects = await nextConfig.redirects!();
    const entry = redirects.find((r) => r.source === "/old-page");
    expect(entry).toBeDefined();
    expect(entry!.destination).toBe("/el/new-page");
    expect(entry!.permanent).toBe(true);
  });

  it("materializes external-301 URL mappings as permanent redirects", async () => {
    mockUrlMappings([
      {
        legacyPath: "/old-external",
        destinationPath: "https://example.com/new-page",
        destinationKind: "external-301",
      },
    ]);

    const redirects = await nextConfig.redirects!();
    const entry = redirects.find((r) => r.source === "/old-external");
    expect(entry).toBeDefined();
    expect(entry!.destination).toBe("https://example.com/new-page");
  });

  it("does NOT materialize gone-410 mappings as redirect entries", async () => {
    mockUrlMappings([
      {
        legacyPath: "/retired-page",
        destinationPath: "",
        destinationKind: "gone-410",
      },
    ]);

    const redirects = await nextConfig.redirects!();
    const goneEntry = redirects.find((r) => r.source === "/retired-page");
    expect(goneEntry).toBeUndefined();
  });

  it("gracefully degrades when Strapi is unreachable", async () => {
    mockedFetch.mockRejectedValueOnce(new Error("Connection refused"));

    // Should not throw — redirects() must complete even when Strapi is down.
    const redirects = await nextConfig.redirects!();
    // Hardcoded redirects and wildcard should still be present.
    expect(redirects.length).toBeGreaterThan(0);
    expect(redirects.some((r) => r.source.includes("sitemap.xml"))).toBe(true);
  });

  it("handles empty URL mapping response gracefully", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ data: [] }),
    });

    const redirects = await nextConfig.redirects!();
    // Should still have hardcoded redirects + wildcard, but no extra
    // URL-mapping entries.
    expect(redirects.length).toBeGreaterThan(0);
  });

  it("handles non-ok Strapi response gracefully", async () => {
    mockedFetch.mockResolvedValueOnce({
      ok: false,
      status: 500,
    });

    const redirects = await nextConfig.redirects!();
    expect(redirects.length).toBeGreaterThan(0);
  });

  it("handles Unicode legacy paths in internal-301 mappings", async () => {
    mockUrlMappings([
      {
        legacyPath: "/αμυγδαλεκτομή",
        destinationPath: "/el/amygdalektomi",
        destinationKind: "internal-301",
      },
    ]);

    const redirects = await nextConfig.redirects!();
    const entry = redirects.find((r) => r.source === "/αμυγδαλεκτομή");
    expect(entry).toBeDefined();
    expect(entry!.destination).toBe("/el/amygdalektomi");
  });

  it("passes locale-prefixed URL mappings through", async () => {
    mockUrlMappings([
      {
        legacyPath: "/el/old-slug",
        destinationPath: "/el/new-slug",
        destinationKind: "internal-301",
      },
    ]);

    const redirects = await nextConfig.redirects!();
    const entry = redirects.find((r) => r.source === "/el/old-slug");
    expect(entry).toBeDefined();
    expect(entry!.destination).toBe("/el/new-slug");
  });
});
