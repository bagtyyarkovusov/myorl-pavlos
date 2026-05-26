import { describe, expect, it } from "vitest";

import { buildWebPageLd } from "./webpage";
import type { PageDTO } from "@/lib/cms/types";

const basePage: PageDTO = {
  documentId: "test",
  locale: "el",
  slug: "about",
  title: "About Us",
  navLabel: "About",
  pageType: "content",
  layoutVariant: "standard",
  renderMode: "cms",
  seo: {
    metaTitle: null,
    metaDescription: "Learn about our clinic",
    robotsNoindex: false,
    robotsNofollow: false,
    sitemapExclude: false,
  },
  seoTitle: "About Us",
  isFolder: false,
  hideFromMenu: false,
  menuIndex: 0,
  relatedPages: [],
  relatedTopics: [],
  tags: [],
  alternateUrls: {},
  disclaimerOverride: "default",
  sections: [],
};

describe("buildWebPageLd", () => {
  it("generates a WebPage schema with required fields", () => {
    const ld = buildWebPageLd(basePage, "https://myorl.example.com");

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@type"]).toBe("WebPage");
    expect(ld.name).toBe("About Us");
    expect(ld.url).toBe("https://myorl.example.com/el/about");
    expect(ld.inLanguage).toBe("el");
  });

  it("includes description when available", () => {
    const ld = buildWebPageLd(basePage, "https://myorl.example.com");
    expect(ld.description).toBe("Learn about our clinic");
  });

  it("omits description when not available", () => {
    const page: PageDTO = {
      ...basePage,
      seo: { ...basePage.seo, metaDescription: null },
    };
    const ld = buildWebPageLd(page, "https://myorl.example.com");
    expect(ld.description).toBeUndefined();
  });

  it("resolves home slug to locale root", () => {
    const page: PageDTO = { ...basePage, slug: "index" };
    const ld = buildWebPageLd(page, "https://myorl.example.com");
    expect(ld.url).toBe("https://myorl.example.com/el");
  });

  it("uses schemaType override when provided in seo", () => {
    const page: PageDTO = {
      ...basePage,
      seo: { ...basePage.seo, schemaType: "MedicalWebPage" },
    };
    const ld = buildWebPageLd(page, "https://myorl.example.com");
    expect(ld["@type"]).toBe("MedicalWebPage");
  });

  it("defaults to WebPage when schemaType is not provided", () => {
    const page: PageDTO = {
      ...basePage,
      seo: { ...basePage.seo, schemaType: null },
    };
    const ld = buildWebPageLd(page, "https://myorl.example.com");
    expect(ld["@type"]).toBe("WebPage");
  });
});
