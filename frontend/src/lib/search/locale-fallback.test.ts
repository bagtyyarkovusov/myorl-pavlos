import { describe, expect, it } from "vitest";
import { resolveFallbackHref, otherLocale } from "./locale-fallback";
import type { SearchDocument } from "./index-document";
import type { Locale } from "@/lib/cms/types";

function makeDoc(overrides: Partial<SearchDocument> & { locale: Locale }): SearchDocument {
  return {
    id: "test:1",
    type: "page",
    title: "Test",
    excerpt: "",
    body: "",
    slug: "test",
    href: "/" + overrides.locale + "/test",
    thumbnail: null,
    parentTitle: null,
    parentSlug: null,
    publishedAt: "2024-01-01",
    parentSection: null,
    parentSectionLabel: null,
    tags: [],
    layoutVariant: "standard",
    _rankBoost: 100,
    localizations: [],
    ...overrides,
  };
}

describe("resolveFallbackHref", () => {
  it("returns translation href when localization exists for visitor locale", () => {
    const doc = makeDoc({
      locale: "el",
      href: "/el/astheneies",
      localizations: [{ locale: "ru" as Locale, slug: "bolezni", href: "/ru/bolezni" }],
    });

    expect(resolveFallbackHref(doc, "ru")).toBe("/ru/bolezni");
  });

  it("returns original href when no localization matches visitor locale", () => {
    const doc = makeDoc({
      locale: "el",
      href: "/el/astheneies",
      localizations: [],
    });

    expect(resolveFallbackHref(doc, "ru")).toBe("/el/astheneies");
  });

  it("returns same href when result locale equals visitor locale (no-op)", () => {
    const doc = makeDoc({
      locale: "el",
      href: "/el/astheneies",
      localizations: [{ locale: "ru" as Locale, slug: "bolezni", href: "/ru/bolezni" }],
    });

    expect(resolveFallbackHref(doc, "el")).toBe("/el/astheneies");
  });

  it("handles empty localizations array", () => {
    const doc = makeDoc({
      locale: "ru",
      href: "/ru/bolezni",
      localizations: [],
    });

    expect(resolveFallbackHref(doc, "el")).toBe("/ru/bolezni");
  });

  it("handles video results (empty localizations array)", () => {
    const doc = makeDoc({
      id: "video:1",
      type: "video",
      locale: "el",
      href: "/el/video",
      localizations: [],
    });

    expect(resolveFallbackHref(doc, "ru")).toBe("/el/video");
  });
});

describe("otherLocale", () => {
  it("returns ru when given el", () => {
    expect(otherLocale("el")).toBe("ru");
  });

  it("returns el when given ru", () => {
    expect(otherLocale("ru")).toBe("el");
  });
});
