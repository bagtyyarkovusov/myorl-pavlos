import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { buildPageBreadcrumbLd } from "./page-breadcrumbs";
import type { PageDTO } from "@/lib/cms/types";

const basePage: PageDTO = {
  documentId: "test-1",
  locale: "el",
  slug: "about",
  title: "About Us",
  navLabel: "About",
  pageType: "content",
  layoutVariant: "standard",
  renderMode: "cms",
  seo: {
    robotsNoindex: false,
    robotsNofollow: false,
    sitemapExclude: false,
  },
  seoTitle: "About Us",
  isFolder: false,
  hideFromMenu: false,
  menuIndex: 0,
  tags: [],
  alternateUrls: {},
  sections: [],
};

describe("buildPageBreadcrumbLd", () => {
  beforeEach(() => {
    vi.stubEnv("STRAPI_URL", "http://localhost:1337");
    vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://myorl.example.com");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns null for the home page", () => {
    const home: PageDTO = { ...basePage, slug: "index", title: "Home", navLabel: "Home" };
    expect(buildPageBreadcrumbLd(home)).toBeNull();
  });

  it("builds a trail with home + current page", () => {
    const ld = buildPageBreadcrumbLd(basePage);
    expect(ld?.itemListElement).toHaveLength(2);
    expect(ld?.itemListElement[0]?.name).toBe("Home");
    expect(ld?.itemListElement[1]?.name).toBe("About");
    expect(ld?.itemListElement[1]?.item).toBe("https://myorl.example.com/el/about");
  });

  it("includes parent page when present", () => {
    const page: PageDTO = {
      ...basePage,
      parentPage: { documentId: "parent-1", slug: "services", title: "Services" },
    };
    const ld = buildPageBreadcrumbLd(page);
    expect(ld?.itemListElement).toHaveLength(3);
    expect(ld?.itemListElement[1]?.name).toBe("Services");
    expect(ld?.itemListElement[1]?.item).toBe("https://myorl.example.com/el/services");
  });
});
