import { describe, expect, it } from "vitest";

import { buildFooterLinks } from "./build-footer-links";
import type { NavigationNodeDTO } from "@/lib/cms/types";

function makeNode(overrides: Partial<NavigationNodeDTO>): NavigationNodeDTO {
  return {
    documentId: overrides.documentId ?? "doc-" + (overrides.slug ?? "x"),
    locale: "el",
    slug: overrides.slug ?? "x",
    title: overrides.title ?? "Title",
    navLabel: overrides.navLabel ?? overrides.title ?? "Title",
    menuTitle: overrides.menuTitle ?? null,
    menuIndex: overrides.menuIndex ?? 0,
    hideFromMenu: false,
    isFolder: false,
    parentPage: null,
    externalUrl: null,
    excerpt: null,
    featuredImage: null,
    imageCenter: null,
    footerCategory: overrides.footerCategory ?? "none",
    href: overrides.href ?? "/el/" + (overrides.slug ?? "x"),
    children: overrides.children ?? [],
  } as NavigationNodeDTO;
}

describe("buildFooterLinks", () => {
  it("groups pages by footerCategory", () => {
    const nav: NavigationNodeDTO[] = [
      makeNode({ slug: "yperesies", footerCategory: "services", menuIndex: 1 }),
      makeNode({ slug: "klinikes", footerCategory: "patients", menuIndex: 2 }),
      makeNode({ slug: "about", footerCategory: "company", menuIndex: 3 }),
    ];

    const result = buildFooterLinks(nav);

    expect(result.services).toHaveLength(1);
    expect(result.services[0]!.href).toBe("/el/yperesies");
    expect(result.patients).toHaveLength(1);
    expect(result.patients[0]!.href).toBe("/el/klinikes");
    expect(result.company).toHaveLength(1);
    expect(result.company[0]!.href).toBe("/el/about");
  });

  it("excludes pages with footerCategory 'none' or undefined", () => {
    const nav: NavigationNodeDTO[] = [
      makeNode({ slug: "hidden", footerCategory: "none" }),
      makeNode({ slug: "no-cat" }),
    ];

    const result = buildFooterLinks(nav);
    expect(result.services).toHaveLength(0);
    expect(result.patients).toHaveLength(0);
    expect(result.company).toHaveLength(0);
  });

  it("sorts links within each group by menuIndex ascending", () => {
    const nav: NavigationNodeDTO[] = [
      makeNode({ slug: "z", footerCategory: "services", menuIndex: 30 }),
      makeNode({ slug: "a", footerCategory: "services", menuIndex: 10 }),
      makeNode({ slug: "m", footerCategory: "services", menuIndex: 20 }),
    ];

    const result = buildFooterLinks(nav);
    expect(result.services.map((l) => l.href)).toEqual(["/el/a", "/el/m", "/el/z"]);
  });

  it("sorts stably by slug when menuIndex is equal", () => {
    const nav: NavigationNodeDTO[] = [
      makeNode({ slug: "beta", footerCategory: "services", menuIndex: 10 }),
      makeNode({ slug: "alpha", footerCategory: "services", menuIndex: 10 }),
      makeNode({ slug: "gamma", footerCategory: "services", menuIndex: 10 }),
    ];

    const result = buildFooterLinks(nav);
    expect(result.services.map((l) => l.href)).toEqual(["/el/alpha", "/el/beta", "/el/gamma"]);
  });

  it("returns empty groups when no pages match", () => {
    const result = buildFooterLinks([]);
    expect(result.services).toEqual([]);
    expect(result.patients).toEqual([]);
    expect(result.company).toEqual([]);
  });

  it("flattens nested children when navigation is a tree", () => {
    const nav: NavigationNodeDTO[] = [
      makeNode({
        slug: "parent",
        footerCategory: "none",
        children: [
          makeNode({ slug: "child-a", footerCategory: "services", menuIndex: 1 }),
          makeNode({ slug: "child-b", footerCategory: "company", menuIndex: 2 }),
        ],
      }),
    ];

    const result = buildFooterLinks(nav);
    expect(result.services.map((l) => l.href)).toEqual(["/el/child-a"]);
    expect(result.company.map((l) => l.href)).toEqual(["/el/child-b"]);
  });

  it("uses navLabel as the link label, falling back to title", () => {
    const nav: NavigationNodeDTO[] = [
      makeNode({
        slug: "with-label",
        footerCategory: "services",
        navLabel: "Custom Label",
        title: "Original Title",
      }),
      makeNode({
        slug: "no-label",
        footerCategory: "services",
        navLabel: "",
        title: "Fallback Title",
        menuIndex: 5,
      }),
    ];

    const result = buildFooterLinks(nav);
    expect(result.services[0]!.label).toBe("Custom Label");
    expect(result.services[1]!.label).toBe("Fallback Title");
  });
});
