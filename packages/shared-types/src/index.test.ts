import { describe, expect, it } from "vitest";
import type { PageType, LayoutVariant, SectionComponent, RenderMode, SitemapChangeFrequency } from "./index";

describe("PageType union", () => {
  it("accepts all expected literal values", () => {
    const values: PageType[] = [
      "home",
      "content",
      "faq",
      "accordion",
      "tabs",
      "gallery",
      "contact",
      "system",
    ];
    expect(values).toHaveLength(8);
  });
});

describe("LayoutVariant union", () => {
  it("accepts all expected literal values", () => {
    const values: LayoutVariant[] = [
      "home",
      "standard",
      "service-article",
      "service-faq",
      "service-accordion",
      "service-tabs",
      "clinic-gallery",
      "office-gallery",
      "encyclopedia-article",
      "section-index",
      "clinic-index",
      "video-index",
      "encyclopedia-index",
      "appointment-form",
      "not-found",
      "search-results",
      "sitemap",
      "specialized-article",
      "contact",
      "testimonials-index",
    ];
    expect(values).toHaveLength(20);
  });
});

describe("SectionComponent union", () => {
  it("accepts all expected literal values", () => {
    const values: SectionComponent[] = [
      "sections.promo-slider",
      "sections.linked-resources",
      "sections.social-links",
      "sections.video",
      "sections.advantages",
      "sections.accordion",
      "sections.faq",
      "sections.tabs",
      "sections.gallery",
      "sections.contact",
    ];
    expect(values).toHaveLength(10);
  });
});

describe("RenderMode union", () => {
  it("accepts cms and frontend-native", () => {
    const values: RenderMode[] = ["cms", "frontend-native"];
    expect(values).toHaveLength(2);
  });
});

describe("SitemapChangeFrequency union", () => {
  it("accepts all expected literal values", () => {
    const values: SitemapChangeFrequency[] = [
      "always",
      "hourly",
      "daily",
      "weekly",
      "monthly",
      "yearly",
      "never",
    ];
    expect(values).toHaveLength(7);
  });
});
