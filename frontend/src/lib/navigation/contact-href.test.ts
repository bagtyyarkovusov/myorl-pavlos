import { describe, expect, it } from "vitest";

import type { NavigationInput } from "@/lib/cms/types";
import { defaultContactHref, resolveContactHref } from "@/lib/navigation/contact-href";

function makePage(
  overrides: Partial<NavigationInput> & Pick<NavigationInput, "slug">,
): NavigationInput {
  return {
    documentId: `doc-${overrides.slug}`,
    locale: "el",
    title: overrides.slug,
    navLabel: overrides.slug,
    menuIndex: 0,
    hideFromMenu: false,
    isFolder: false,
    layoutVariant: "standard",
    tags: [],
    ...overrides,
  };
}

describe("resolveContactHref", () => {
  it("resolves hidden contact pages by layout variant", () => {
    const pages = [
      makePage({
        slug: "epikoinonia",
        layoutVariant: "contact",
        hideFromMenu: true,
        title: "Επικοινωνία",
      }),
    ];

    expect(resolveContactHref(pages, "el")).toBe("/el/epikoinonia");
  });

  it("falls back to locale slug when no pages match", () => {
    expect(resolveContactHref([], "el")).toBe("/el/epikoinonia");
    expect(resolveContactHref([], "ru")).toBe("/ru/kontakty");
  });
});

describe("defaultContactHref", () => {
  it("returns canonical locale paths", () => {
    expect(defaultContactHref("el")).toBe("/el/epikoinonia");
    expect(defaultContactHref("ru")).toBe("/ru/kontakty");
  });
});
