import { describe, expect, it } from "vitest";

import nextConfig from "./next.config";

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
