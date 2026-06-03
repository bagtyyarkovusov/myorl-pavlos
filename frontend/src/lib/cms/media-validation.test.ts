import { describe, expect, it } from "vitest";

import {
  auditDirectoryNodeMedia,
  auditPageMedia,
  MAX_MEDIA_WIDTH,
  MAX_MEDIA_HEIGHT,
  MIN_MEDIA_WIDTH,
  MIN_MEDIA_HEIGHT,
} from "./media-validation";
import type { MediaDTO } from "./types/common";
import type { NavigationNodeDTO, PageDTO } from "./types/page";

function makeMedia(overrides: Partial<MediaDTO> = {}): MediaDTO {
  return {
    url: "/uploads/example.jpg",
    alternativeText: "Example",
    width: 1200,
    height: 800,
    ...overrides,
  };
}

function makeNode(
  slug: string,
  opts: { imageCenter?: MediaDTO | null; featuredImage?: MediaDTO | null } = {},
): NavigationNodeDTO {
  return {
    documentId: `doc-${slug}`,
    locale: "el",
    slug,
    title: slug,
    navLabel: slug,
    menuTitle: null,
    menuIndex: 0,
    hideFromMenu: false,
    isFolder: false,
    layoutVariant: "standard",
    externalUrl: null,
    excerpt: null,
    featuredImage: opts.featuredImage ?? null,
    imageCenter: opts.imageCenter ?? null,
    tags: [],
    href: `/el/${slug}`,
    children: [],
  };
}

function makePage(overrides: Partial<PageDTO> = {}): PageDTO {
  return {
    documentId: "doc-page",
    locale: "el",
    slug: "test-page",
    title: "Test Page",
    navLabel: "Test Page",
    pageType: "content",
    layoutVariant: "standard",
    renderMode: "cms",
    menuIndex: 1,
    hideFromMenu: false,
    isFolder: false,
    featuredImage: null,
    imageCenter: null,
    excerpt: null,
    content: null,
    seo: {
      metaTitle: null,
      metaDescription: null,
      canonicalUrl: null,
      ogImage: null,
      robotsNoindex: false,
      robotsNofollow: false,
      sitemapExclude: false,
      sitemapPriority: null,
      sitemapChangeFrequency: null,
    },
    seoTitle: "Test Page",
    tags: [],
    relatedPages: [],
    relatedTopics: [],
    parentPage: null,
    disclaimerOverride: "default",
    alternateUrls: {},
    sections: [],
    ...overrides,
  };
}

describe("auditDirectoryNodeMedia", () => {
  it("returns an empty array when the node has no media", () => {
    const node = makeNode("no-media");
    expect(auditDirectoryNodeMedia(node)).toEqual([]);
  });

  it("flags an image that exceeds the maximum width", () => {
    const node = makeNode("too-wide", {
      featuredImage: makeMedia({ width: MAX_MEDIA_WIDTH + 1, height: 800 }),
    });

    const entries = auditDirectoryNodeMedia(node);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.documentId).toBe("doc-too-wide");
    expect(entries[0]!.reason).toMatch(/width/i);
    expect(entries[0]!.currentWidth).toBe(MAX_MEDIA_WIDTH + 1);
  });

  it("flags an image that exceeds the maximum height", () => {
    const node = makeNode("too-tall", {
      featuredImage: makeMedia({ width: 1200, height: MAX_MEDIA_HEIGHT + 1 }),
    });

    const entries = auditDirectoryNodeMedia(node);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.reason).toMatch(/height/i);
    expect(entries[0]!.currentHeight).toBe(MAX_MEDIA_HEIGHT + 1);
  });

  it("flags an image below the minimum width", () => {
    const node = makeNode("too-narrow", {
      featuredImage: makeMedia({ width: MIN_MEDIA_WIDTH - 1, height: 800 }),
    });

    const entries = auditDirectoryNodeMedia(node);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.reason).toMatch(/width/i);
  });

  it("flags an image below the minimum height", () => {
    const node = makeNode("too-short", {
      featuredImage: makeMedia({ width: 1200, height: MIN_MEDIA_HEIGHT - 1 }),
    });

    const entries = auditDirectoryNodeMedia(node);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.reason).toMatch(/height/i);
  });

  it("flags an image with missing dimensions", () => {
    const node = makeNode("no-dims", {
      featuredImage: makeMedia({ width: null, height: null }),
    });

    const entries = auditDirectoryNodeMedia(node);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.reason).toMatch(/missing dimensions/i);
  });

  it("prefers imageCenter over featuredImage for auditing", () => {
    const node = makeNode("center-wins", {
      imageCenter: makeMedia({ width: MAX_MEDIA_WIDTH + 1 }),
      featuredImage: makeMedia({ width: 1200 }),
    });

    const entries = auditDirectoryNodeMedia(node);
    expect(entries).toHaveLength(1);
    // It flags the imageCenter (the one that's actually displayed), not the ok one
    expect(entries[0]!.reason).toMatch(/width/i);
  });

  it("passes a node with valid media dimensions", () => {
    const node = makeNode("valid", {
      featuredImage: makeMedia({ width: 1200, height: 800 }),
    });

    expect(auditDirectoryNodeMedia(node)).toEqual([]);
  });

  it("flags each problem separately when multiple issues exist", () => {
    const node = makeNode("multi", {
      featuredImage: makeMedia({ width: MAX_MEDIA_WIDTH + 1, height: MAX_MEDIA_HEIGHT + 1 }),
    });

    const entries = auditDirectoryNodeMedia(node);
    expect(entries).toHaveLength(2);
    expect(entries[0]!.reason).toMatch(/width/i);
    expect(entries[1]!.reason).toMatch(/height/i);
  });
});

describe("auditPageMedia", () => {
  it("flags page-level featuredImage when it has bad dimensions", () => {
    const page = makePage({
      featuredImage: makeMedia({ width: null, height: null }),
    });

    const entries = auditPageMedia(page);
    expect(entries).toHaveLength(1);
    expect(entries[0]!.documentId).toBe("doc-page");
  });

  it("returns no entries for a page with valid media", () => {
    const page = makePage({
      featuredImage: makeMedia({ width: 1200, height: 800 }),
      imageCenter: null,
    });

    expect(auditPageMedia(page)).toEqual([]);
  });

  it("returns no entries for a page with no media", () => {
    expect(auditPageMedia(makePage())).toEqual([]);
  });
});
