import { describe, expect, it } from "vitest";
import type { NavigationNodeDTO, PageDTO } from "./types";
import { getTabBarNodes, getTabBarConfig, isSectionHubChild, MAX_VISIBLE_TABS } from "./tab-bar";

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
    layoutVariant: "standard",
    excerpt: null,
    tags: [],
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

  it("returns self + children for section-hub folder pages (not excluded like section-index)", () => {
    const children = [
      makeNode("child-1", "Child 1", { parentDocId: "doc-services" }),
      makeNode("child-2", "Child 2", { parentDocId: "doc-services" }),
      makeNode("child-3", "Child 3", { parentDocId: "doc-services" }),
    ];
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page: PageDTO = {
      ...makePage("services", { isFolder: true }),
      layoutVariant: "section-hub",
    };

    const result = getTabBarNodes(tree, page);
    expect(result).not.toBeNull();
    expect(result!.map((n) => n.slug)).toEqual(["services", "child-1", "child-2", "child-3"]);
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

  it("returns null when parent is not a folder (standalone page under structural parent)", () => {
    const children = [
      makeNode("child-1", "Child 1", { parentDocId: "doc-standard-parent" }),
      makeNode("child-2", "Child 2", { parentDocId: "doc-standard-parent" }),
    ];
    const parent = makeNode("standard-parent", "Standard Parent", { isFolder: false, children });
    const tree = [parent];
    const page = makePage("child-1", { parentDocId: "doc-standard-parent" });

    expect(getTabBarNodes(tree, page)).toBeNull();
  });

  it("returns null when leaf page has no siblings", () => {
    const children = [makeNode("only-child", "Only Child", { parentDocId: "doc-services" })];
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("only-child", { parentDocId: "doc-services" });

    expect(getTabBarNodes(tree, page)).toBeNull();
  });

  it("returns just siblings (no parent) for leaf page under section-hub folder", () => {
    const children = [
      makeNode("child-1", "Child 1", { parentDocId: "doc-services" }),
      makeNode("child-2", "Child 2", { parentDocId: "doc-services" }),
      makeNode("child-3", "Child 3", { parentDocId: "doc-services" }),
    ];
    const parent: NavigationNodeDTO = {
      ...makeNode("services", "Services", { isFolder: true, children }),
      layoutVariant: "section-hub",
    };
    const tree = [parent];
    const page = makePage("child-2", { parentDocId: "doc-services" });

    const result = getTabBarNodes(tree, page);
    expect(result).not.toBeNull();
    // Should be just siblings, no parent tab
    expect(result!.map((n) => n.slug)).toEqual(["child-1", "child-2", "child-3"]);
  });
});

describe("isSectionHubChild", () => {
  it("returns true for a leaf page under a section-hub folder", () => {
    const parent: NavigationNodeDTO = {
      ...makeNode("folder", "Folder", { isFolder: true, children: [] }),
      layoutVariant: "section-hub",
    };
    const tree = [parent];
    const page = makePage("leaf", { parentDocId: "doc-folder" });
    expect(isSectionHubChild(tree, page)).toBe(true);
  });

  it("returns false for folder pages", () => {
    const tree: NavigationNodeDTO[] = [];
    const page = makePage("folder", { isFolder: true });
    expect(isSectionHubChild(tree, page)).toBe(false);
  });

  it("returns false for orphan pages (no parent)", () => {
    const tree: NavigationNodeDTO[] = [];
    const page = makePage("orphan");
    expect(isSectionHubChild(tree, page)).toBe(false);
  });

  it("returns false when parent is not section-hub", () => {
    const parent: NavigationNodeDTO = {
      ...makeNode("folder", "Folder", { isFolder: true, children: [] }),
      layoutVariant: "standard",
    };
    const tree = [parent];
    const page = makePage("leaf", { parentDocId: "doc-folder" });
    expect(isSectionHubChild(tree, page)).toBe(false);
  });

  it("returns false when parent not found in tree", () => {
    const tree: NavigationNodeDTO[] = [];
    const page = makePage("leaf", { parentDocId: "doc-missing" });
    expect(isSectionHubChild(tree, page)).toBe(false);
  });
});

describe("getTabBarConfig", () => {
  it("returns visible + overflow when leaf siblings exceed maxVisible", () => {
    const children = Array.from({ length: 10 }, (_, i) =>
      makeNode(`child-${i}`, `Child ${i}`, { parentDocId: "doc-services" }),
    );
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("child-5", { parentDocId: "doc-services" });

    const config = getTabBarConfig(tree, page);
    expect(config).not.toBeNull();
    // Visible is siblings only (parent excluded for leaf), capped at maxVisible
    expect(config!.visible.length).toBeLessThanOrEqual(6);
    // Overflow = remaining siblings beyond maxVisible
    expect(config!.overflow.length).toBe(10 - 6);
    expect(config!.isLeaf).toBe(true);
  });

  it("returns no overflow when leaf siblings fit within maxVisible", () => {
    const children = [
      makeNode("a", "A", { parentDocId: "doc-services" }),
      makeNode("b", "B", { parentDocId: "doc-services" }),
      makeNode("c", "C", { parentDocId: "doc-services" }),
    ];
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("a", { parentDocId: "doc-services" });

    const config = getTabBarConfig(tree, page);
    expect(config).not.toBeNull();
    expect(config!.visible.length).toBe(3); // 3 siblings, under limit
    expect(config!.overflow.length).toBe(0);
    expect(config!.isLeaf).toBe(true);
  });

  it("promotes active leaf page into visible set when it would be in overflow", () => {
    const children = Array.from({ length: 10 }, (_, i) =>
      makeNode(`child-${i}`, `Child ${i}`, { parentDocId: "doc-services" }),
    );
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("child-8", { parentDocId: "doc-services" });

    const config = getTabBarConfig(tree, page);
    expect(config).not.toBeNull();
    // child-8 should be in visible (promoted from position 8 to last visible slot)
    expect(config!.visible.map((n) => n.slug)).toContain("child-8");
    expect(config!.visible.length).toBe(6);
  });

  it("returns folder tabs with self first and no isLeaf", () => {
    const children = Array.from({ length: 8 }, (_, i) =>
      makeNode(`child-${i}`, `Child ${i}`, { parentDocId: "doc-services" }),
    );
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("services", { isFolder: true });

    const config = getTabBarConfig(tree, page);
    expect(config).not.toBeNull();
    expect(config!.visible[0]!.slug).toBe("services");
    expect(config!.visible.length).toBe(6);
    expect(config!.overflow.length).toBe(3); // 9 total - 6 visible
    expect(config!.isLeaf).toBe(false);
  });

  it("returns null for orphan pages (delegates to getTabBarNodes)", () => {
    const tree = [makeNode("about", "About")];
    const page = makePage("about");
    expect(getTabBarConfig(tree, page)).toBeNull();
  });

  it("accepts custom maxVisible", () => {
    const children = Array.from({ length: 8 }, (_, i) =>
      makeNode(`child-${i}`, `Child ${i}`, { parentDocId: "doc-parent" }),
    );
    const parent = makeNode("parent", "Parent", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("child-0", { parentDocId: "doc-parent" });

    const config = getTabBarConfig(tree, page, 3);
    expect(config!.visible.length).toBe(3);
    expect(config!.overflow.length).toBe(5); // 8 siblings - 3 visible
  });

  it("returns isLeaf=false and no back-link for section-hub folder pages", () => {
    const children = Array.from({ length: 10 }, (_, i) =>
      makeNode(`child-${i}`, `Child ${i}`, { parentDocId: "doc-services" }),
    );
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page: PageDTO = {
      ...makePage("services", { isFolder: true }),
      layoutVariant: "section-hub",
    };

    const config = getTabBarConfig(tree, page);
    expect(config).not.toBeNull();
    expect(config!.isLeaf).toBe(false);
    // Self is first visible tab
    expect(config!.visible[0]!.slug).toBe("services");
    expect(config!.visible.length).toBe(MAX_VISIBLE_TABS);
    expect(config!.overflow.length).toBe(11 - MAX_VISIBLE_TABS);
  });

  it("returns isLeaf=false for section-hub child pages (no back-link)", () => {
    const children = Array.from({ length: 8 }, (_, i) =>
      makeNode(`child-${i}`, `Child ${i}`, { parentDocId: "doc-services" }),
    );
    const parent: NavigationNodeDTO = {
      ...makeNode("services", "Services", { isFolder: true, children }),
      layoutVariant: "section-hub",
    };
    const tree = [parent];
    const page = makePage("child-3", { parentDocId: "doc-services" });

    const config = getTabBarConfig(tree, page);
    expect(config).not.toBeNull();
    expect(config!.isLeaf).toBe(false);
    // Tabs are just siblings, no parent
    expect(config!.visible.map((n) => n.slug)).not.toContain("services");
    expect(config!.visible.map((n) => n.slug)).toContain("child-3");
  });

  it("promotes active section-hub child into visible set", () => {
    const children = Array.from({ length: 10 }, (_, i) =>
      makeNode(`child-${i}`, `Child ${i}`, { parentDocId: "doc-services" }),
    );
    const parent: NavigationNodeDTO = {
      ...makeNode("services", "Services", { isFolder: true, children }),
      layoutVariant: "section-hub",
    };
    const tree = [parent];
    const page = makePage("child-8", { parentDocId: "doc-services" });

    const config = getTabBarConfig(tree, page);
    expect(config).not.toBeNull();
    expect(config!.visible.map((n) => n.slug)).toContain("child-8");
    expect(config!.visible.length).toBe(6);
    expect(config!.isLeaf).toBe(false);
  });
});
