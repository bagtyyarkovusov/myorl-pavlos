import { describe, expect, it } from "vitest";
import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

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
    relatedPages: [],
    relatedTopics: [],
    tags: [],
    infoBlockBottom: null,
    articleAuthor: null,
    sources: null,
    popUpClose: null,
    disclaimerOverride: "default",
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

    // For folder pages: self + 2 children = 3 links, no back-link
    const links = within(nav).getAllByRole("link");
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
      makeNode("child-a", "Child A Label", { parentDocId: "doc-parent" }),
      makeNode("child-b", "Child B Label", { parentDocId: "doc-parent" }),
    ];
    const parent = makeNode("parent", "Parent Label", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("parent", { isFolder: true });

    render(<SectionTabBar navigation={tree} currentPage={page} />);
    expect(screen.getByText("Parent Label")).toBeTruthy();
    expect(screen.getByText("Child A Label")).toBeTruthy();
    expect(screen.getByText("Child B Label")).toBeTruthy();
  });

  it("hides when a folder has only one child", () => {
    const children = [makeNode("only-child", "Only Child", { parentDocId: "doc-parent" })];
    const parent = makeNode("parent", "Parent Label", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("parent", { isFolder: true });

    const { container } = render(<SectionTabBar navigation={tree} currentPage={page} />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("hides when a leaf page has no siblings", () => {
    const children = [makeNode("only-child", "Only Child", { parentDocId: "doc-parent" })];
    const parent = makeNode("parent", "Parent Label", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("only-child", { parentDocId: "doc-parent" });

    const { container } = render(<SectionTabBar navigation={tree} currentPage={page} />);
    expect(container.querySelector("nav")).toBeNull();
  });

  it("renders back-link for leaf pages under a folder", () => {
    const children = [
      makeNode("a", "AAA", { parentDocId: "doc-parent" }),
      makeNode("b", "BBB", { parentDocId: "doc-parent" }),
    ];
    const parent = makeNode("parent", "Parent", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("a", { parentDocId: "doc-parent" });

    render(<SectionTabBar navigation={tree} currentPage={page} />);

    const backLink = screen.getByRole("link", { name: /Parent/ });
    expect(backLink).toBeTruthy();
    expect(backLink).toHaveAttribute("href", "/el/parent");
  });

  it("does not show back-link for folder pages", () => {
    const children = [
      makeNode("a", "AAA", { parentDocId: "doc-parent" }),
      makeNode("b", "BBB", { parentDocId: "doc-parent" }),
    ];
    const parent = makeNode("parent", "Parent", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("parent", { isFolder: true });

    render(<SectionTabBar navigation={tree} currentPage={page} />);

    // The back-link text starts with "←" — should not exist for folders
    const backLink = screen.queryByRole("link", { name: /←/ });
    expect(backLink).toBeNull();
  });

  it("shows More+N button when siblings exceed visible limit", () => {
    const children = Array.from({ length: 10 }, (_, i) =>
      makeNode(`child-${i}`, `Child ${i}`, { parentDocId: "doc-services" }),
    );
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("child-5", { parentDocId: "doc-services" });

    render(<SectionTabBar navigation={tree} currentPage={page} />);

    const moreButton = screen.getByRole("button", { name: /Περισσότερα/i });
    expect(moreButton).toBeTruthy();
  });

  it("opens dropdown on more-button click and shows overflow items", async () => {
    const children = Array.from({ length: 10 }, (_, i) =>
      makeNode(`child-${i}`, `Child ${i}`, { parentDocId: "doc-services" }),
    );
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("child-0", { parentDocId: "doc-services" });

    const user = userEvent.setup();
    render(<SectionTabBar navigation={tree} currentPage={page} />);

    const moreButton = screen.getByRole("button", { name: /Περισσότερα/i });
    await user.click(moreButton);

    const options = screen.getAllByRole("option");
    // 10 siblings - 6 visible = 4 overflow
    expect(options.length).toBe(4);
  });

  it("closes dropdown on outside click", async () => {
    const children = Array.from({ length: 10 }, (_, i) =>
      makeNode(`child-${i}`, `Child ${i}`, { parentDocId: "doc-services" }),
    );
    const parent = makeNode("services", "Services", { isFolder: true, children });
    const tree = [parent];
    const page = makePage("child-0", { parentDocId: "doc-services" });

    const user = userEvent.setup();
    const { container } = render(
      <div>
        <SectionTabBar navigation={tree} currentPage={page} />
        <button data-outside>outside</button>
      </div>,
    );

    const moreButton = screen.getByRole("button", { name: /Περισσότερα/i });
    await user.click(moreButton);
    expect(screen.getAllByRole("option").length).toBeGreaterThan(0);

    await user.click(screen.getByRole("button", { name: "outside" }));
    expect(screen.queryByRole("option")).toBeNull();
  });
});
