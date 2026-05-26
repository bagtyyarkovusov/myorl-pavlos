import { describe, expect, it, vi } from "vitest";

import { buildAlternates } from "./sitemap";

const siteUrl = "https://myorl.gr";

describe("buildAlternates", () => {
  it("includes x-default pointing at EL when both locales exist", () => {
    const page = {
      alternateUrls: { el: "/el/about", ru: "/ru/o-nas" },
    } as Parameters<typeof buildAlternates>[0];

    const result = buildAlternates(page, siteUrl);
    expect(result?.languages).toHaveProperty("x-default", "https://myorl.gr/el/about");
    expect(result?.languages).toHaveProperty("el");
    expect(result?.languages).toHaveProperty("ru");
  });

  it("falls back to RU with warning when EL alternate is missing", () => {
    const warnSpy = vi.spyOn(console, "warn").mockImplementation(() => {});
    try {
      const page = {
        alternateUrls: { ru: "/ru/o-nas" },
      } as Parameters<typeof buildAlternates>[0];

      const result = buildAlternates(page, siteUrl);
      expect(result?.languages).toHaveProperty("x-default", "https://myorl.gr/ru/o-nas");
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining("No EL alternate URL for x-default hreflang"),
      );
    } finally {
      warnSpy.mockRestore();
    }
  });

  it("omits x-default when no alternates exist", () => {
    const page = {
      alternateUrls: {},
    } as Parameters<typeof buildAlternates>[0];

    const result = buildAlternates(page, siteUrl);
    expect(result).toBeUndefined();
  });
});
