import { describe, expect, it } from "vitest";

import type { PageDTO, VideoEntryDTO } from "@/lib/cms/types";

import { indexPageDocument, indexVideoDocument } from "./index-document";

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
      parentSectionLabel: "Home",
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

function makeVideo(overrides: Partial<VideoEntryDTO> = {}): VideoEntryDTO {
  return {
    documentId: "video789xy",
    locale: "el",
    title: "Rhinoplasty Recovery",
    youtubeId: "dQw4w9WgXcQ",
    youtubeUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
    categories: [
      { slug: "rhinoplasty", label: "Rhinoplasty" },
      { slug: "recovery", label: "Recovery" },
    ],
    sortOrder: 1,
    relatedArticle: {
      documentId: "page123",
      slug: "rinoplastika",
      title: "Rhinoplasty Guide",
    },
    legacyArticleUrl: null,
    ...overrides,
  };
}

describe("indexVideoDocument", () => {
  it("maps a VideoEntryDTO to the canonical Search Document shape", () => {
    const document = indexVideoDocument(makeVideo());

    expect(document).toEqual({
      id: "video:video789xy",
      type: "video",
      locale: "el",
      title: "Rhinoplasty Recovery",
      excerpt: "Rhinoplasty, Recovery",
      body: "Rhinoplasty Recovery",
      slug: "",
      href: "/el/video",
      thumbnail: null,
      parentTitle: null,
      parentSlug: null,
      publishedAt: expect.any(String),
      parentSection: null,
      parentSectionLabel: null,
      tags: ["rhinoplasty", "recovery"],
      layoutVariant: "video-index",
      _rankBoost: 50,
      localizations: [],
    });
  });

  it("null for entries without a title", () => {
    expect(indexVideoDocument(makeVideo({ title: "" }))).toBeNull();
    expect(indexVideoDocument(makeVideo({ title: "   " }))).toBeNull();
  });

  it("uses empty categories for excerpt and body when there are none", () => {
    const document = indexVideoDocument(makeVideo({ categories: [] }));
    expect(document?.excerpt).toBe("");
    expect(document?.body).toBe("");
    expect(document?.tags).toEqual([]);
  });

  it("resolves href to the video directory", () => {
    const el = indexVideoDocument(makeVideo({ locale: "el" }));
    expect(el?.href).toBe("/el/video");

    const ru = indexVideoDocument(makeVideo({ locale: "ru" }));
    expect(ru?.href).toBe("/ru/video");
  });
});
