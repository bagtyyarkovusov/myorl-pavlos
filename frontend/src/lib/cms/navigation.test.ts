import { describe, expect, it } from "vitest";
import { buildNavigationTree } from "./navigation";
import type { NavigationInput } from "./types";

function makePage(overrides: Partial<NavigationInput> = {}): NavigationInput {
  return {
    documentId: "default-id",
    locale: "el",
    slug: "default-slug",
    title: "Default Title",
    menuTitle: null,
    navLabel: "Default Title",
    menuIndex: 0,
    hideFromMenu: false,
    parentPage: null,
    externalUrl: null,
    isFolder: false,
    layoutVariant: "standard",
    excerpt: null,
    ...overrides,
  };
}

describe("buildNavigationTree", () => {
  it("returns empty array for empty pages list", () => {
    const tree = buildNavigationTree([], "el");
    expect(tree).toEqual([]);
  });

  it("builds a simple parent-child tree", () => {
    const pages: NavigationInput[] = [
      makePage({ documentId: "root", slug: "root", title: "Root" }),
      makePage({
        documentId: "child",
        slug: "child",
        title: "Child",
        parentPage: { documentId: "root", slug: "root", title: "Root" },
      }),
    ];

    const tree = buildNavigationTree(pages, "el");
    expect(tree).toHaveLength(1);
    expect(tree[0]!.documentId).toBe("root");
    expect(tree[0]!.children).toHaveLength(1);
    expect(tree[0]!.children[0]!.documentId).toBe("child");
  });

  it("treats node with non-existent parent as root", () => {
    const pages: NavigationInput[] = [
      makePage({
        documentId: "orphan",
        slug: "orphan",
        title: "Orphan",
        parentPage: { documentId: "nonexistent", slug: "ghost", title: "Ghost" },
      }),
    ];

    const tree = buildNavigationTree(pages, "el");
    expect(tree).toHaveLength(1);
    expect(tree[0]!.documentId).toBe("orphan");
    expect(tree[0]!.children).toHaveLength(0);
  });

  it("handles circular parent references without infinite loop", () => {
    const pages: NavigationInput[] = [
      makePage({
        documentId: "a",
        slug: "a",
        title: "Page A",
        parentPage: { documentId: "b", slug: "b", title: "Page B" },
      }),
      makePage({
        documentId: "b",
        slug: "b",
        title: "Page B",
        parentPage: { documentId: "a", slug: "a", title: "Page A" },
      }),
    ];

    const tree = buildNavigationTree(pages, "el");

    expect(tree.length).toBeGreaterThan(0);

    function collectDepths(node: NonNullable<(typeof tree)[number]>, depth: number): number[] {
      const result = [depth];
      for (const child of node.children) {
        result.push(...collectDepths(child as typeof node, depth + 1));
      }
      return result;
    }

    const depths = tree.flatMap((node) => collectDepths(node, 0));
    expect(Math.max(...depths)).toBeLessThan(50);
  });

  it("handles self-referencing parent without infinite loop", () => {
    const pages: NavigationInput[] = [
      makePage({
        documentId: "self",
        slug: "self",
        title: "Self Parent",
        parentPage: { documentId: "self", slug: "self", title: "Self Parent" },
      }),
    ];

    const tree = buildNavigationTree(pages, "el");
    expect(tree).toHaveLength(1);
    expect(tree[0]!.documentId).toBe("self");
    expect(tree[0]!.children).toHaveLength(0);
  });

  it("sorts by menuIndex then slug then navLabel", () => {
    const pages: NavigationInput[] = [
      makePage({ documentId: "b", slug: "b", title: "B", navLabel: "B", menuIndex: 0 }),
      makePage({ documentId: "a", slug: "a", title: "A", navLabel: "A", menuIndex: 0 }),
      makePage({ documentId: "c", slug: "c", title: "C", navLabel: "C", menuIndex: 1 }),
    ];

    const tree = buildNavigationTree(pages, "el");
    expect(tree.map((n) => n.documentId)).toEqual(["a", "b", "c"]);
  });

  it("sorts stably when menuIndex is null or undefined", () => {
    const pages: NavigationInput[] = [
      makePage({
        documentId: "b",
        slug: "b",
        navLabel: "B",
        menuIndex: undefined as unknown as number,
      }),
      makePage({ documentId: "c", slug: "c", navLabel: "C", menuIndex: null as unknown as number }),
      makePage({ documentId: "a", slug: "a", navLabel: "A", menuIndex: 0 }),
    ];

    const tree = buildNavigationTree(pages, "el");
    expect(tree.map((n) => n.documentId)).toEqual(["a", "b", "c"]);
  });

  it("filters out pages with hideFromMenu", () => {
    const pages: NavigationInput[] = [
      makePage({ documentId: "visible", slug: "visible", title: "Visible" }),
      makePage({ documentId: "hidden", slug: "hidden", title: "Hidden", hideFromMenu: true }),
    ];

    const tree = buildNavigationTree(pages, "el");
    expect(tree).toHaveLength(1);
    expect(tree[0]!.documentId).toBe("visible");
  });

  it("filters out pages from other locales", () => {
    const pages: NavigationInput[] = [
      makePage({ documentId: "el-page", slug: "el-page", locale: "el" }),
      makePage({ documentId: "ru-page", slug: "ru-page", locale: "ru" }),
    ];

    const tree = buildNavigationTree(pages, "el");
    expect(tree).toHaveLength(1);
    expect(tree[0]!.documentId).toBe("el-page");
  });
});
