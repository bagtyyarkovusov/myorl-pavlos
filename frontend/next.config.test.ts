import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

function match(pathname: string, source: string): boolean {
  const raw =
    /^:([a-zA-Z_]\w*)\((.+)\)$|^:([a-zA-Z_]\w*)$/;
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
