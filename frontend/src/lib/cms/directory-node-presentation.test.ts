import { describe, expect, it } from "vitest";

import {
  getDirectoryExternalHost,
  getDirectoryNodeDescription,
  getDirectoryNodeMedia,
} from "./directory-node-presentation";
import type { NavigationNodeDTO } from "./types";

function makeNode(overrides: Partial<NavigationNodeDTO> = {}): NavigationNodeDTO {
  return {
    documentId: "doc-1",
    locale: "ru",
    slug: "clinic",
    title: "Clinic",
    navLabel: "Clinic",
    menuIndex: 1,
    hideFromMenu: false,
    isFolder: false,
    layoutVariant: "clinic-index",
    externalUrl: null,
    excerpt: null,
    featuredImage: null,
    imageCenter: null,
    tags: [],
    href: "/ru/clinic",
    children: [],
    ...overrides,
  };
}

describe("getDirectoryNodeMedia", () => {
  it("prefers imageCenter, then featuredImage, then seo ogImage", () => {
    const center = { url: "/center.jpg", alternativeText: null, width: null, height: null };
    const featured = { url: "/featured.jpg", alternativeText: null, width: null, height: null };
    const og = { url: "/og.jpg", alternativeText: null, width: null, height: null };

    expect(getDirectoryNodeMedia(makeNode({ imageCenter: center }))).toEqual(center);
    expect(getDirectoryNodeMedia(makeNode({ featuredImage: featured }))).toEqual(featured);
    expect(getDirectoryNodeMedia(makeNode({ seo: { ogImage: og } }))).toEqual(og);
  });
});

describe("getDirectoryNodeDescription", () => {
  it("prefers excerpt over seo metaDescription", () => {
    expect(
      getDirectoryNodeDescription(
        makeNode({
          excerpt: "<p>Clinic excerpt</p>",
          seo: { metaDescription: "SEO description" },
        }),
      ),
    ).toBe("Clinic excerpt");
  });

  it("falls back to seo metaDescription when excerpt is empty", () => {
    expect(
      getDirectoryNodeDescription(
        makeNode({
          seo: { metaDescription: "Private hospital in Athens" },
        }),
      ),
    ).toBe("Private hospital in Athens");
  });
});

describe("getDirectoryExternalHost", () => {
  it("returns the hostname for external clinic links", () => {
    expect(
      getDirectoryExternalHost(
        makeNode({
          externalUrl: "http://www.mediterraneohospital.gr/",
          href: "http://www.mediterraneohospital.gr/",
        }),
      ),
    ).toBe("mediterraneohospital.gr");
  });
});
