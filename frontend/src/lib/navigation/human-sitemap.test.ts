import { describe, expect, it } from "vitest";

import type { NavigationNodeDTO } from "@/lib/cms/types";
import { filterHumanSitemapTree } from "./human-sitemap";

function makeNav(slug: string, overrides: Partial<NavigationNodeDTO> = {}): NavigationNodeDTO {
  return {
    documentId: `doc-${slug}`,
    locale: "el",
    slug,
    title: slug,
    menuTitle: null,
    navLabel: slug,
    menuIndex: 0,
    hideFromMenu: false,
    parentPage: null,
    externalUrl: null,
    isFolder: false,
    layoutVariant: "standard",
    excerpt: null,
    featuredImage: null,
    imageCenter: null,
    href: `/el/${slug}`,
    tags: [],
    children: [],
    ...overrides,
  };
}

describe("filterHumanSitemapTree", () => {
  it("excludes system layout variants", () => {
    const tree = [
      makeNav("services"),
      makeNav("404", { layoutVariant: "not-found", hideFromMenu: true }),
      makeNav("search", { layoutVariant: "search-results", hideFromMenu: true }),
    ];

    const result = filterHumanSitemapTree(tree);
    expect(result.map((n) => n.slug)).toEqual(["services"]);
  });

  it("excludes the current sitemap page by slug", () => {
    const tree = [makeNav("index"), makeNav("sitemap", { layoutVariant: "sitemap" })];

    const result = filterHumanSitemapTree(tree, { excludeSlug: "sitemap" });
    expect(result.map((n) => n.slug)).toEqual(["index"]);
  });

  it("drops hidden root orphans but keeps hidden section sub-pages", () => {
    const tree = [
      makeNav("pathiseis", {
        children: [makeNav("septum-child", { hideFromMenu: true })],
      }),
      makeNav("privacy-policy", { hideFromMenu: true }),
    ];

    const result = filterHumanSitemapTree(tree);
    expect(result.map((n) => n.slug)).toEqual(["pathiseis"]);
    expect(result[0]!.children.map((n) => n.slug)).toEqual(["septum-child"]);
  });

  it("recursively filters excluded layouts from nested children", () => {
    const tree = [
      makeNav("menu", {
        children: [
          makeNav("rantevou", { layoutVariant: "appointment-form", hideFromMenu: true }),
          makeNav("video"),
        ],
      }),
    ];

    const result = filterHumanSitemapTree(tree);
    expect(result[0]!.children.map((n) => n.slug)).toEqual(["video"]);
  });
});
