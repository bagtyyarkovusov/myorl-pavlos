import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SectionTabBar } from "./SectionTabBar";
import type { NavigationNodeDTO, PageDTO } from "@/lib/cms/types";

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

describe("SectionTabBar", () => {
  it("renders nothing for orphan pages", () => {
    const tree = [makeNode("about", "About")];
    const page = makePage("about");

    const { container } = render(<SectionTabBar navigation={tree} currentPage={page} />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders nav with links for folder pages", () => {
    const children = [
      makeNode("intro", "Introduction", { parentDocId: "doc-services" }),
      makeNode("steps", "Steps", { parentDocId: "doc-services" }),
    ];
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("services", { isFolder: true });

    render(<SectionTabBar navigation={tree} currentPage={page} />);

    const nav = screen.getByRole("navigation");
    expect(nav).toBeTruthy();

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(3);
    expect(links[0]).toHaveAttribute("href", "/el/services");
    expect(links[1]).toHaveAttribute("href", "/el/intro");
    expect(links[2]).toHaveAttribute("href", "/el/steps");
  });

  it("marks the current page with aria-current", () => {
    const children = [
      makeNode("intro", "Introduction", { parentDocId: "doc-services" }),
      makeNode("steps", "Steps", { parentDocId: "doc-services" }),
    ];
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("steps", { parentDocId: "doc-services" });

    render(<SectionTabBar navigation={tree} currentPage={page} />);

    const activeLink = screen.getByRole("link", { name: "Steps" });
    expect(activeLink).toHaveAttribute("aria-current", "page");

    const inactiveLink = screen.getByRole("link", { name: "Introduction" });
    expect(inactiveLink).not.toHaveAttribute("aria-current");
  });

  it("uses navLabel for link text", () => {
    const children = [
      makeNode("child", "Child Label", { parentDocId: "doc-parent" }),
    ];
    const parent = makeNode("parent", "Parent Label", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("parent", { isFolder: true });

    render(<SectionTabBar navigation={tree} currentPage={page} />);
    expect(screen.getByText("Parent Label")).toBeTruthy();
    expect(screen.getByText("Child Label")).toBeTruthy();
  });
});
