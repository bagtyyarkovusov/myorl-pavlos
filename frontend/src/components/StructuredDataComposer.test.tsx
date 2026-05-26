import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { StructuredDataComposer } from "./StructuredDataComposer";
import type { PageDTO } from "@/lib/cms/types";

const SITE_URL = "https://myorl.gr";

function makePage(overrides: Partial<PageDTO> = {}): PageDTO {
  return {
    documentId: "doc-1",
    locale: "el",
    slug: "test-page",
    title: "Test Page",
    navLabel: "Test",
    pageType: "content",
    layoutVariant: "standard",
    renderMode: "cms",
    seo: {
      metaTitle: "Test",
      metaDescription: "Test desc",
      ogImage: null,
      canonicalUrl: null,
      schemaType: null,
      robotsNoindex: false,
      robotsNofollow: false,
      sitemapExclude: false,
      sitemapPriority: null,
      sitemapChangeFrequency: null,
    },
    seoTitle: "Test Page",
    content: null,
    excerpt: null,
    featuredImage: null,
    imageCenter: null,
    externalUrl: null,
    isFolder: false,
    hideFromMenu: false,
    menuIndex: 0,
    menuTitle: null,
    parentPage: null,
    tags: [],
    infoBlockBottom: null,
    articleAuthor: null,
    sources: null,
    popUpClose: null,
    alternateUrls: {},
    sections: [],
    ...overrides,
  } as PageDTO;
}

describe("StructuredDataComposer", () => {
  it("emits exactly one script tag", () => {
    const { container } = render(<StructuredDataComposer page={makePage()} siteUrl={SITE_URL} />);
    const scripts = container.querySelectorAll('script[type="application/ld+json"]');
    expect(scripts).toHaveLength(1);
  });

  it("wraps all schemas in a single @graph array", () => {
    const { container } = render(<StructuredDataComposer page={makePage()} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");

    expect(ld["@context"]).toBe("https://schema.org");
    expect(ld["@graph"]).toBeInstanceOf(Array);
    const types = ld["@graph"].map((g: Record<string, unknown>) => g["@type"]);
    expect(types).toContain("WebSite");
    expect(types).toContain("WebPage");
  });

  it("emits BreadcrumbList for non-home pages inside @graph", () => {
    const page = makePage({ slug: "yperesies" });
    const { container } = render(<StructuredDataComposer page={page} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");
    const types = ld["@graph"].map((g: Record<string, unknown>) => g["@type"]);
    expect(types).toContain("BreadcrumbList");
  });

  it("does not emit BreadcrumbList for home page", () => {
    const page = makePage({ slug: "index" });
    const { container } = render(<StructuredDataComposer page={page} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");
    const types = ld["@graph"].map((g: Record<string, unknown>) => g["@type"]);
    expect(types).not.toContain("BreadcrumbList");
  });

  it("emits section-specific schemas inside @graph when matching sections are present", () => {
    const page = makePage({
      sections: [
        {
          __component: "sections.faq",
          heading: "FAQ",
          intro: null,
          items: [{ question: "Q", answer: "A" }],
        },
      ] as PageDTO["sections"],
    });

    const { container } = render(<StructuredDataComposer page={page} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");
    const types = ld["@graph"].map((g: Record<string, unknown>) => g["@type"]);
    expect(types).toContain("FAQPage");
  });

  it("uses schemaType override for WebPage @type when set", () => {
    const page = makePage({
      seo: {
        metaTitle: "Test",
        metaDescription: "Test desc",
        ogImage: null,
        canonicalUrl: null,
        schemaType: "MedicalWebPage",
        robotsNoindex: false,
        robotsNofollow: false,
        sitemapExclude: false,
        sitemapPriority: null,
        sitemapChangeFrequency: null,
      },
    });

    const { container } = render(<StructuredDataComposer page={page} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");
    const webPage = ld["@graph"].find(
      (g: Record<string, unknown>) => g["@type"] === "MedicalWebPage",
    );
    expect(webPage).toBeDefined();
  });

  it("emits Physician schema for viografiko slug", () => {
    const page = makePage({ slug: "viografiko" });
    const { container } = render(<StructuredDataComposer page={page} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");
    const types = ld["@graph"].map((g: Record<string, unknown>) => g["@type"]);
    expect(types).toContain("Physician");
  });

  it("emits MedicalProcedure schema for service-article layoutVariant", () => {
    const page = makePage({ layoutVariant: "service-article" });
    const { container } = render(<StructuredDataComposer page={page} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");
    const types = ld["@graph"].map((g: Record<string, unknown>) => g["@type"]);
    expect(types).toContain("MedicalProcedure");
  });

  it("emits MedicalCondition schema for encyclopedia-article layoutVariant", () => {
    const page = makePage({ layoutVariant: "encyclopedia-article" });
    const { container } = render(<StructuredDataComposer page={page} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");
    const types = ld["@graph"].map((g: Record<string, unknown>) => g["@type"]);
    expect(types).toContain("MedicalCondition");
  });

  it("emits Article schema for specialized-article layoutVariant", () => {
    const page = makePage({ layoutVariant: "specialized-article" });
    const { container } = render(<StructuredDataComposer page={page} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");
    const types = ld["@graph"].map((g: Record<string, unknown>) => g["@type"]);
    expect(types).toContain("Article");
  });

  it("does not emit Physician for non-viografiko slugs", () => {
    const page = makePage({ slug: "yperesies" });
    const { container } = render(<StructuredDataComposer page={page} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");
    const types = ld["@graph"].map((g: Record<string, unknown>) => g["@type"]);
    expect(types).not.toContain("Physician");
  });

  it("does not emit layoutVariant schemas for standard pages", () => {
    const page = makePage({ layoutVariant: "standard" });
    const { container } = render(<StructuredDataComposer page={page} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");
    const types = ld["@graph"].map((g: Record<string, unknown>) => g["@type"]);
    expect(types).not.toContain("MedicalProcedure");
    expect(types).not.toContain("MedicalCondition");
    expect(types).not.toContain("Article");
  });

  it("still honors schemaType override when layoutVariant schemas are emitted", () => {
    const page = makePage({
      layoutVariant: "encyclopedia-article",
      seo: {
        metaTitle: "Test",
        metaDescription: "Test desc",
        ogImage: null,
        canonicalUrl: null,
        schemaType: "MedicalWebPage",
        robotsNoindex: false,
        robotsNofollow: false,
        sitemapExclude: false,
        sitemapPriority: null,
        sitemapChangeFrequency: null,
      },
    });

    const { container } = render(<StructuredDataComposer page={page} siteUrl={SITE_URL} />);
    const script = container.querySelector('script[type="application/ld+json"]')!;
    const ld = JSON.parse(script.textContent ?? "{}");
    const types = ld["@graph"].map((g: Record<string, unknown>) => g["@type"]);
    expect(types).toContain("MedicalWebPage");
    expect(types).toContain("MedicalCondition");
  });
});
