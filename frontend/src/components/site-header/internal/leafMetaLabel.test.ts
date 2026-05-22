import { describe, expect, it } from "vitest";

import type { NavigationNodeDTO } from "@/lib/cms/types";

import { leafMetaLabel, sectionEntryCount } from "./leafMetaLabel";

const topicsLabel = (count: number) => `${count} topics`;

const base: NavigationNodeDTO = {
  documentId: "base",
  locale: "el",
  slug: "test",
  title: "Test",
  navLabel: "Test",
  menuTitle: null,
  excerpt: null,
  href: "/el/test",
  menuIndex: 0,
  hideFromMenu: false,
  isFolder: false,
  layoutVariant: "standard",
  parentPage: null,
  externalUrl: null,
  tags: [],
  children: [],
};

function makeNode(overrides: Partial<NavigationNodeDTO>): NavigationNodeDTO {
  return { ...base, ...overrides };
}

function makeParent(): NavigationNodeDTO {
  return { ...base, documentId: "parent", title: "Parent", navLabel: "Parent" };
}

describe("leafMetaLabel", () => {
  it("returns child count for parent children", () => {
    const node = makeNode({
      documentId: "p",
      children: [makeNode({ documentId: "c1" }), makeNode({ documentId: "c2" })],
    });
    expect(leafMetaLabel(node, makeParent(), topicsLabel)).toBe("2 topics");
  });

  it("falls back to excerpt instead of returning a singular child count", () => {
    const node = makeNode({
      documentId: "p",
      excerpt: "Video library overview",
      children: [makeNode({ documentId: "c1" })],
    });
    expect(leafMetaLabel(node, makeParent(), topicsLabel)).toBe("Video library overview");
  });

  it("returns null for a single-child parent without descriptive text", () => {
    const node = makeNode({
      documentId: "p",
      title: "Videos",
      navLabel: "Videos",
      children: [makeNode({ documentId: "c1" })],
    });
    expect(leafMetaLabel(node, makeParent(), topicsLabel)).toBeNull();
  });

  it("returns excerpt for leaf with excerpt", () => {
    const node = makeNode({
      documentId: "leaf",
      excerpt: "Brief summary",
      children: [],
    });
    expect(leafMetaLabel(node, makeParent(), topicsLabel)).toBe("Brief summary");
  });

  it("returns alternate title when title differs from navLabel", () => {
    const node = makeNode({
      documentId: "leaf",
      title: "Long Title",
      navLabel: "Short",
      excerpt: null,
    });
    expect(leafMetaLabel(node, makeParent(), topicsLabel)).toBe("Long Title");
  });

  it("returns null when title equals navLabel and no excerpt", () => {
    const node = makeNode({
      documentId: "leaf",
      title: "Same",
      navLabel: "Same",
      excerpt: null,
    });
    expect(leafMetaLabel(node, makeParent(), topicsLabel)).toBeNull();
  });

  it("returns null when title differs from navLabel only by case", () => {
    const node = makeNode({
      documentId: "leaf",
      title: "Меню",
      navLabel: "МЕНЮ",
      excerpt: null,
    });
    expect(leafMetaLabel(node, makeParent(), topicsLabel)).toBeNull();
  });

  it("trims excerpt whitespace", () => {
    const node = makeNode({
      documentId: "leaf",
      excerpt: "  trimmed  ",
    });
    expect(leafMetaLabel(node, makeParent(), topicsLabel)).toBe("trimmed");
  });

  it("returns null for empty excerpt string after trim", () => {
    const node = makeNode({
      documentId: "leaf",
      excerpt: "   ",
    });
    expect(leafMetaLabel(node, makeParent(), topicsLabel)).toBeNull();
  });
});

describe("sectionEntryCount", () => {
  it("counts direct menu children shown in the section", () => {
    const item = makeNode({
      documentId: "services",
      children: [
        makeNode({ documentId: "consultation", children: [] }),
        makeNode({
          documentId: "surgery",
          children: [makeNode({ documentId: "ent" }), makeNode({ documentId: "head-neck" })],
        }),
      ],
    });

    expect(sectionEntryCount(item)).toBe(2);
  });

  it("returns zero for leaf sections", () => {
    expect(sectionEntryCount(makeNode({ documentId: "contact", children: [] }))).toBe(0);
  });
});
