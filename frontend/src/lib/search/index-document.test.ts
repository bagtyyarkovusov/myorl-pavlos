import { describe, expect, it } from "vitest";

import type { PageDTO } from "@/lib/cms/types";

import { indexPageDocument } from "./index-document";

function makePage(overrides: Partial<PageDTO> = {}): PageDTO {
  return {
    documentId: "abc123xy",
    locale: "el",
    slug: "about",
    title: "About Us",
    menuTitle: "About",
    navLabel: "About",
    pageType: "content",
    layoutVariant: "standard",
    renderMode: "cms",
    seo: {
      metaTitle: "About Us | Clinic",
      metaDescription: "Learn about our clinic",
      canonicalUrl: null,
      ogImage: null,
      schemaType: null,
      robotsNoindex: false,
      robotsNofollow: false,
      sitemapExclude: false,
      sitemapPriority: 0.8,
      sitemapChangeFrequency: "monthly",
    },
    seoTitle: "About Us | Clinic",
    content: "<p>We are a <strong>dental</strong> clinic.</p>",
    excerpt: "About our clinic",
    featuredImage: {
      url: "https://example.com/uploads/about.jpg",
      alternativeText: "About",
      width: 1200,
      height: 800,
    },
    imageCenter: null,
    externalUrl: null,
    isFolder: false,
    hideFromMenu: false,
    menuIndex: 3,
    footerCategory: "none",
    parentPage: {
      documentId: "home123",
      slug: "index",
      title: "Home",
      featuredImage: null,
    },
    relatedPages: [],
    relatedTopics: [],
    tags: [{ name: "General", slug: "general" }],
    infoBlockBottom: null,
    articleAuthor: null,
    sources: null,
    popUpClose: null,
    alternateUrls: {
      el: "https://example.com/el/about",
      ru: "https://example.com/ru/o-nas",
    },
    sections: [
      {
        __component: "sections.faq",
        heading: "FAQ",
        intro: "Common questions",
        items: [
          {
            question: "What should I bring?",
            answer: "<p>Bring your medical records.</p>",
          },
        ],
      },
      {
        __component: "sections.accordion",
        heading: "Details",
        intro: null,
        items: [
          {
            title: "Preparation",
            content: "<p>Avoid eating before the visit.</p>",
          },
        ],
      },
    ],
    ...overrides,
  };
}

describe("indexPageDocument", () => {
  it("maps a PageDTO to the canonical Search Document shape", () => {
    const document = indexPageDocument(makePage());

    expect(document).toEqual({
      id: "page:abc123xy",
      type: "page",
      locale: "el",
      title: "About Us",
      excerpt: "About our clinic",
      body: expect.stringContaining("We are a dental clinic."),
      slug: "about",
      href: "/el/about",
      thumbnail: "https://example.com/uploads/about.jpg",
      parentTitle: "Home",
      parentSlug: "index",
      publishedAt: expect.any(String),
      parentSection: "index",
      tags: ["general"],
      layoutVariant: "standard",
      _rankBoost: 100,
      localizations: [
        {
          locale: "ru",
          slug: "o-nas",
          href: "https://example.com/ru/o-nas",
        },
      ],
    });
  });

  it("walks FAQ and Accordion Page text into the flattened body", () => {
    const document = indexPageDocument(makePage());

    expect(document?.body).toContain("FAQ");
    expect(document?.body).toContain("Common questions");
    expect(document?.body).toContain("What should I bring?");
    expect(document?.body).toContain("Bring your medical records.");
    expect(document?.body).toContain("Preparation");
    expect(document?.body).toContain("Avoid eating before the visit.");
  });

  it("excludes frontend-native system layouts", () => {
    const document = indexPageDocument(
      makePage({
        pageType: "system",
        layoutVariant: "search-results",
        renderMode: "frontend-native",
      }),
    );

    expect(document).toBeNull();
  });

  it("excludes Appointment Pages by layout variant even when they are CMS content pages", () => {
    const document = indexPageDocument(
      makePage({
        pageType: "content",
        layoutVariant: "appointment-form",
        renderMode: "cms",
      }),
    );

    expect(document).toBeNull();
  });
});
