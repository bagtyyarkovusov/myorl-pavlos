import { describe, expect, it } from "vitest";

import { resolveRelatedTopics, withRelatedTopics } from "./related-topics";
import type { NavigationNodeDTO, PageDTO } from "./types";

function makeNavNode(
  overrides: Partial<NavigationNodeDTO> & Pick<NavigationNodeDTO, "documentId" | "slug" | "title">,
): NavigationNodeDTO {
  return {
    locale: "el",
    menuTitle: null,
    navLabel: overrides.title,
    menuIndex: 0,
    hideFromMenu: false,
    parentPage: null,
    externalUrl: null,
    isFolder: false,
    layoutVariant: "encyclopedia-article",
    excerpt: null,
    featuredImage: null,
    imageCenter: null,
    href: `/el/${overrides.slug}`,
    tags: [],
    children: [],
    ...overrides,
  };
}

function makeArticlePage(overrides: Partial<PageDTO> = {}): PageDTO {
  return {
    documentId: "current",
    locale: "el",
    slug: "current",
    title: "Current Article",
    menuTitle: null,
    navLabel: "Current Article",
    pageType: "content",
    layoutVariant: "encyclopedia-article",
    renderMode: "cms",
    seo: {
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      ogImage: null,
      schemaType: null,
      robotsNoindex: false,
      robotsNofollow: false,
      sitemapExclude: false,
      sitemapPriority: null,
      sitemapChangeFrequency: null,
    },
    seoTitle: "Current Article",
    isFolder: false,
    hideFromMenu: false,
    menuIndex: 0,
    parentPage: { documentId: "hub", slug: "hub", title: "Hub" },
    relatedPages: [],
    relatedTopics: [],
    tags: [{ name: "Pediatric", slug: "pediatric" }],
    alternateUrls: {},
    disclaimerOverride: "default",
    sections: [],
    ...overrides,
  };
}

describe("resolveRelatedTopics", () => {
  it("returns empty for non-article layouts", () => {
    const page = makeArticlePage({ layoutVariant: "contact" });
    expect(resolveRelatedTopics(page, [])).toEqual([]);
  });

  it("resolves related topics for standard layout pages", () => {
    const page = makeArticlePage({ layoutVariant: "standard" });
    const tree: NavigationNodeDTO[] = [
      makeNavNode({
        documentId: "peer",
        slug: "peer",
        title: "Peer",
        layoutVariant: "standard",
        tags: [{ name: "Pediatric", slug: "pediatric" }],
      }),
    ];
    expect(resolveRelatedTopics(page, tree)).toHaveLength(1);
  });

  it("uses editor relatedPages when present", () => {
    const manual = [{ documentId: "m1", slug: "manual", title: "Manual" }];
    const page = makeArticlePage({ relatedPages: manual });
    const result = resolveRelatedTopics(page, []);
    expect(result).toEqual(manual);
  });

  it("includes preview images from navigation auto-suggest", () => {
    const tree: NavigationNodeDTO[] = [
      makeNavNode({
        documentId: "peer",
        slug: "peer",
        title: "Peer article",
        tags: [{ name: "Pediatric", slug: "pediatric" }],
        featuredImage: {
          url: "https://cdn.example/peer.jpg",
          alternativeText: "Peer",
          width: 400,
          height: 300,
        },
      }),
    ];
    const page = makeArticlePage();
    const result = resolveRelatedTopics(page, tree);
    expect(result[0]?.featuredImage?.url).toBe("https://cdn.example/peer.jpg");
  });

  it("caps manual relatedPages at six", () => {
    const manual = Array.from({ length: 8 }, (_, index) => ({
      documentId: `m${index}`,
      slug: `manual-${index}`,
      title: `Manual ${index}`,
    }));
    const page = makeArticlePage({ relatedPages: manual });
    expect(resolveRelatedTopics(page, [])).toHaveLength(6);
  });

  it("ranks tag matches before siblings and caps at six", () => {
    const tree: NavigationNodeDTO[] = [
      makeNavNode({
        documentId: "hub",
        slug: "hub",
        title: "Hub",
        layoutVariant: "section-hub",
        parentPage: null,
        children: [
          makeNavNode({
            documentId: "tagged",
            slug: "tagged",
            title: "Tagged",
            menuIndex: 2,
            parentPage: { documentId: "hub", slug: "hub", title: "Hub" },
            tags: [{ name: "Pediatric", slug: "pediatric" }],
          }),
          makeNavNode({
            documentId: "sibling",
            slug: "sibling",
            title: "Sibling",
            menuIndex: 1,
            parentPage: { documentId: "hub", slug: "hub", title: "Hub" },
            tags: [],
          }),
          makeNavNode({
            documentId: "hidden",
            slug: "hidden",
            title: "Hidden",
            hideFromMenu: true,
            parentPage: { documentId: "hub", slug: "hub", title: "Hub" },
            tags: [{ name: "Pediatric", slug: "pediatric" }],
          }),
          makeNavNode({
            documentId: "faq",
            slug: "faq",
            title: "FAQ",
            layoutVariant: "service-faq",
            parentPage: { documentId: "hub", slug: "hub", title: "Hub" },
            tags: [{ name: "Pediatric", slug: "pediatric" }],
          }),
        ],
      }),
    ];

    const page = makeArticlePage();
    expect(resolveRelatedTopics(page, tree)).toEqual([
      { documentId: "tagged", slug: "tagged", title: "Tagged", featuredImage: null },
      { documentId: "sibling", slug: "sibling", title: "Sibling", featuredImage: null },
    ]);
  });

  it("excludes the current page from auto-suggest", () => {
    const tree: NavigationNodeDTO[] = [
      makeNavNode({
        documentId: "current",
        slug: "current",
        title: "Current Article",
        tags: [{ name: "Pediatric", slug: "pediatric" }],
      }),
    ];
    const page = makeArticlePage();
    expect(resolveRelatedTopics(page, tree)).toEqual([]);
  });

  it("excludes parent hub/index pages from auto-suggest", () => {
    const tree: NavigationNodeDTO[] = [
      makeNavNode({
        documentId: "hub",
        slug: "hub",
        title: "Hub Parent",
        layoutVariant: "section-hub",
        parentPage: null,
        tags: [{ name: "Pediatric", slug: "pediatric" }],
        children: [],
      }),
      makeNavNode({
        documentId: "peer",
        slug: "peer",
        title: "Peer Article",
        layoutVariant: "encyclopedia-article",
        parentPage: { documentId: "hub", slug: "hub", title: "Hub Parent" },
        tags: [{ name: "Pediatric", slug: "pediatric" }],
      }),
    ];
    const page = makeArticlePage({
      parentPage: { documentId: "hub", slug: "hub", title: "Hub Parent" },
    });
    const result = resolveRelatedTopics(page, tree);
    // The hub should be excluded; only the peer should appear
    expect(result).toHaveLength(1);
    expect(result[0]?.documentId).toBe("peer");
  });

  it("excludes section-index layout from auto-suggest", () => {
    const tree: NavigationNodeDTO[] = [
      makeNavNode({
        documentId: "index",
        slug: "index",
        title: "Section Index",
        layoutVariant: "section-index",
        tags: [{ name: "Pediatric", slug: "pediatric" }],
      }),
    ];
    const page = makeArticlePage();
    expect(resolveRelatedTopics(page, tree)).toEqual([]);
  });

  it("excludes clinic-index layout from auto-suggest", () => {
    const tree: NavigationNodeDTO[] = [
      makeNavNode({
        documentId: "clinic-idx",
        slug: "clinics",
        title: "Clinic Index",
        layoutVariant: "clinic-index",
        tags: [{ name: "Pediatric", slug: "pediatric" }],
      }),
    ];
    const page = makeArticlePage();
    expect(resolveRelatedTopics(page, tree)).toEqual([]);
  });

  it("returns empty for system pageType even with article layout", () => {
    const page = makeArticlePage({ pageType: "system", layoutVariant: "standard" });
    const tree: NavigationNodeDTO[] = [
      makeNavNode({
        documentId: "peer",
        slug: "peer",
        title: "Peer",
        layoutVariant: "standard",
        tags: [{ name: "Pediatric", slug: "pediatric" }],
      }),
    ];
    expect(resolveRelatedTopics(page, tree)).toEqual([]);
  });

  it("excludes encyclopedia-index layout from auto-suggest", () => {
    const tree: NavigationNodeDTO[] = [
      makeNavNode({
        documentId: "enc-idx",
        slug: "encyclopedia",
        title: "Encyclopedia Index",
        layoutVariant: "encyclopedia-index",
        tags: [{ name: "Pediatric", slug: "pediatric" }],
      }),
    ];
    const page = makeArticlePage();
    expect(resolveRelatedTopics(page, tree)).toEqual([]);
  });
});

describe("withRelatedTopics", () => {
  it("attaches resolved topics to the page DTO", () => {
    const page = makeArticlePage({
      relatedPages: [{ documentId: "m1", slug: "manual", title: "Manual" }],
    });
    const enriched = withRelatedTopics(page, []);
    expect(enriched.relatedTopics).toEqual([{ documentId: "m1", slug: "manual", title: "Manual" }]);
  });
});
