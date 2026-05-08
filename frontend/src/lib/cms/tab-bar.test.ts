import { describe, expect, it } from "vitest";
import type { NavigationNodeDTO, PageDTO } from "./types";
import { getTabBarNodes } from "./tab-bar";

function makeNode(
  slug: string,
  label: string,
  opts: { isFolder?: boolean; parentDocId?: string; children?: NavigationNodeDTO[] } = {},
): NavigationNodeDTO {
  return {
    documentId: `doc-${slug}`,
    locale: "el",
    slug,
    title: label,
    menuTitle: null,
    navLabel: label,
    menuIndex: 0,
    hideFromMenu: false,
    parentPage: opts.parentDocId ? { documentId: opts.parentDocId, slug: null, title: null } : null,
    externalUrl: null,
    isFolder: opts.isFolder ?? false,
    excerpt: null,
    href: `/el/${slug}`,
    children: opts.children ?? [],
  };
}

function makePage(slug: string, opts: { isFolder?: boolean; parentDocId?: string } = {}): PageDTO {
  return {
    documentId: `doc-${slug}`,
    locale: "el",
    slug,
    title: slug,
    menuTitle: null,
    navLabel: slug,
    pageType: "content",
    layoutVariant: "standard",
    renderMode: "cms",
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
    seoTitle: slug,
    content: null,
    excerpt: null,
    featuredImage: null,
    imageCenter: null,
    externalUrl: null,
    isFolder: opts.isFolder ?? false,
    hideFromMenu: false,
    menuIndex: 0,
    parentPage: opts.parentDocId ? { documentId: opts.parentDocId, slug: null, title: null } : null,
    tags: [],
    infoBlockBottom: null,
    articleAuthor: null,
    sources: null,
    popUpClose: null,
    alternateUrls: {},
    sections: [],
  };
}

describe("getTabBarNodes", () => {
  it("returns null for orphan pages (no parent, not a folder)", () => {
    const tree = [makeNode("about", "About")];
    const page = makePage("about");
    expect(getTabBarNodes(tree, page)).toBeNull();
  });

  it("returns self + children when page is a folder", () => {
    const children = [
      makeNode("child-1", "Child 1", { parentDocId: "doc-services" }),
      makeNode("child-2", "Child 2", { parentDocId: "doc-services" }),
    ];
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("services", { isFolder: true });

    const result = getTabBarNodes(tree, page);
    expect(result).not.toBeNull();
    expect(result!.map((n) => n.slug)).toEqual(["services", "child-1", "child-2"]);
  });

  it("returns parent + siblings when page has a parent", () => {
    const children = [
      makeNode("intro", "Introduction", { parentDocId: "doc-services" }),
      makeNode("steps", "Steps", { parentDocId: "doc-services" }),
      makeNode("faq", "FAQ", { parentDocId: "doc-services" }),
    ];
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("steps", { parentDocId: "doc-services" });

    const result = getTabBarNodes(tree, page);
    expect(result).not.toBeNull();
    expect(result!.map((n) => n.slug)).toEqual(["services", "intro", "steps", "faq"]);
  });

  it("returns null when page has parentPage but parent not found in tree", () => {
    const tree = [makeNode("unrelated", "Unrelated")];
    const page = makePage("orphan-child", { parentDocId: "doc-missing" });

    expect(getTabBarNodes(tree, page)).toBeNull();
  });

  it("returns null for section-index layout variant even when page is a folder", () => {
    const children = [makeNode("child-1", "Child 1", { parentDocId: "doc-services" })];
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page: PageDTO = {
      ...makePage("services", { isFolder: true }),
      layoutVariant: "section-index",
    };

    expect(getTabBarNodes(tree, page)).toBeNull();
  });

  it("handles deeply nested tree by finding parent at any depth", () => {
    const grandchildren = [
      makeNode("gc-1", "GC 1", { parentDocId: "doc-child" }),
      makeNode("gc-2", "GC 2", { parentDocId: "doc-child" }),
    ];
    const child = makeNode("child", "Child", {
      isFolder: true,
      parentDocId: "doc-root",
      children: grandchildren,
    });
    const root = makeNode("root", "Root", { isFolder: true, children: [child] });
    const tree = [root];
    const page = makePage("gc-1", { parentDocId: "doc-child" });

    const result = getTabBarNodes(tree, page);
    expect(result).not.toBeNull();
    expect(result![0]!.slug).toBe("child");
  });

  it("returns null when folder has only one child", () => {
    const children = [makeNode("child-1", "Child 1", { parentDocId: "doc-services" })];
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("services", { isFolder: true });

    expect(getTabBarNodes(tree, page)).toBeNull();
  });

  it("returns null when leaf page has no siblings", () => {
    const children = [makeNode("only-child", "Only Child", { parentDocId: "doc-services" })];
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("only-child", { parentDocId: "doc-services" });

    expect(getTabBarNodes(tree, page)).toBeNull();
  });
});
