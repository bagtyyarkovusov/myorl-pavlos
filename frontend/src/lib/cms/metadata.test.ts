import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { toPageMetadata } from "./metadata";
import type { PageDTO } from "./types";

const basePage: PageDTO = {
  documentId: "test123",
  locale: "el",
  slug: "about",
  title: "About Us",
  navLabel: "About",
  pageType: "content",
  layoutVariant: "standard",
  renderMode: "cms",
  seo: {
    metaTitle: "About Us | MyORL",
    metaDescription: "Learn about our clinic",
    robotsNoindex: false,
    robotsNofollow: false,
    sitemapExclude: false,
  },
  seoTitle: "About Us | MyORL",
  isFolder: false,
  hideFromMenu: false,
  menuIndex: 0,
  tags: [],
  alternateUrls: { el: "/el/about", ru: "/ru/o-nas" },
  sections: [],
};

describe("toPageMetadata", () => {
  beforeEach(() => {
    vi.stubEnv("STRAPI_URL", "http://localhost:1337");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://myorl.example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("sets metadataBase from siteUrl config", () => {
    const meta = toPageMetadata(basePage);
    expect(meta.metadataBase).toEqual(new URL("https://myorl.example.com"));
  });

  it("generates Twitter card metadata", () => {
    const meta = toPageMetadata(basePage);
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      title: basePage.seoTitle,
      description: basePage.seo.metaDescription,
    });
  });

  it("includes OG image in Twitter when available", () => {
    const page: PageDTO = {
      ...basePage,
      seo: {
        ...basePage.seo,
        ogImage: { url: "https://cdn.example.com/og.jpg", width: 1200, height: 630 },
      },
    };
    const meta = toPageMetadata(page);
    expect(meta.twitter).toMatchObject({
      card: "summary_large_image",
      images: ["https://cdn.example.com/og.jpg"],
    });
  });

  it("includes OG image dimensions when available", () => {
    const page: PageDTO = {
      ...basePage,
      seo: {
        ...basePage.seo,
        ogImage: { url: "https://cdn.example.com/og.jpg", width: 1200, height: 630 },
      },
    };
    const meta = toPageMetadata(page);
    expect(meta.openGraph?.images).toEqual([
      { url: "https://cdn.example.com/og.jpg", width: 1200, height: 630 },
    ]);
  });

  it("includes siteName in OpenGraph", () => {
    const meta = toPageMetadata(basePage);
    expect(meta.openGraph?.siteName).toBe("MyORL");
  });

  it("includes og:type as website", () => {
    const meta = toPageMetadata(basePage);
    expect(meta.openGraph).toMatchObject({ type: "website" });
  });

  it("includes og:image alt when available", () => {
    const page: PageDTO = {
      ...basePage,
      seo: {
        ...basePage.seo,
        ogImage: {
          url: "https://cdn.example.com/og.jpg",
          width: 1200,
          height: 630,
          alternativeText: "Clinic interior",
        },
      },
    };
    const meta = toPageMetadata(page);
    expect(meta.openGraph?.images).toEqual([
      {
        url: "https://cdn.example.com/og.jpg",
        width: 1200,
        height: 630,
        alt: "Clinic interior",
      },
    ]);
  });
});
