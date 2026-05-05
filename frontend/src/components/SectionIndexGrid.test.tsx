import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { SectionIndexGrid } from "./SectionIndexGrid";
import type { NavigationNodeDTO } from "@/lib/cms/types";
import type { TagDTO } from "@/lib/cms/types/tag";

function makeChild(
  slug: string,
  label: string,
  opts: { menuIndex?: number; excerpt?: string | null } = {},
): NavigationNodeDTO {
  return {
    documentId: `doc-${slug}`,
    locale: "el",
    slug,
    title: label,
    menuTitle: null,
    navLabel: label,
    menuIndex: opts.menuIndex ?? 0,
    hideFromMenu: false,
    parentPage: { documentId: "doc-parent", slug: null, title: null },
    externalUrl: null,
    isFolder: false,
    excerpt: opts.excerpt ?? null,
    href: `/el/${slug}`,
    children: [],
  };
}

describe("SectionIndexGrid", () => {
  it("renders a list of links from navigation children", () => {
    const children = [
      makeChild("rhinoplasty", "Rhinoplasty", { menuIndex: 1 }),
      makeChild("septoplasty", "Septoplasty", { menuIndex: 2 }),
    ];

    render(<SectionIndexGrid items={children} locale="el" />);

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/el/rhinoplasty");
    expect(links[1]).toHaveAttribute("href", "/el/septoplasty");
  });

  it("renders navLabel as the row title", () => {
    const children = [makeChild("tinnitus", "Tinnitus Treatment")];

    render(<SectionIndexGrid items={children} locale="el" />);

    expect(screen.getByText("Tinnitus Treatment")).toBeDefined();
  });

  it("renders excerpt when available", () => {
    const children = [
      makeChild("rhinoplasty", "Rhinoplasty", { excerpt: "Nose reshaping surgery" }),
    ];

    render(<SectionIndexGrid items={children} locale="el" />);

    expect(screen.getByText("Nose reshaping surgery")).toBeDefined();
  });

  it("sorts items by menuIndex", () => {
    const children = [
      makeChild("third", "Third", { menuIndex: 3 }),
      makeChild("first", "First", { menuIndex: 1 }),
      makeChild("second", "Second", { menuIndex: 2 }),
    ];

    render(<SectionIndexGrid items={children} locale="el" />);

    const links = screen.getAllByRole("link");
    expect(links[0]).toHaveAttribute("href", "/el/first");
    expect(links[1]).toHaveAttribute("href", "/el/second");
    expect(links[2]).toHaveAttribute("href", "/el/third");
  });

  it("renders nothing when items is empty", () => {
    const { container } = render(<SectionIndexGrid items={[]} locale="el" />);
    expect(container.firstElementChild).toBeNull();
  });

  it("renders an arrow indicator per row", () => {
    const children = [makeChild("item", "Item")];

    const { container } = render(<SectionIndexGrid items={children} locale="el" />);

    const arrows = container.querySelectorAll("[aria-hidden='true']");
    expect(arrows.length).toBeGreaterThanOrEqual(1);
  });
});

describe("SectionIndexGrid filtering", () => {
  const allTags: TagDTO[] = [
    { name: "Nose", slug: "nose" },
    { name: "Ear", slug: "ear" },
    { name: "Throat", slug: "throat" },
  ];

  const tagMap: Record<string, string[]> = {
    "doc-rhinoplasty": ["nose"],
    "doc-otitis": ["ear"],
    "doc-tonsils": ["throat"],
    "doc-snoring": ["nose", "throat"],
  };

  const items: NavigationNodeDTO[] = [
    makeChild("rhinoplasty", "Rhinoplasty", { menuIndex: 1 }),
    makeChild("otitis", "Otitis", { menuIndex: 2 }),
    makeChild("tonsils", "Tonsils", { menuIndex: 3 }),
    makeChild("snoring", "Snoring", { menuIndex: 4 }),
  ];

  it("renders tag filter buttons when tags are provided", () => {
    render(<SectionIndexGrid items={items} locale="el" tags={allTags} tagMap={tagMap} />);

    expect(screen.getByRole("button", { name: "Nose" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ear" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Throat" })).toBeDefined();
  });

  it("shows all items when no tag is selected", () => {
    render(<SectionIndexGrid items={items} locale="el" tags={allTags} tagMap={tagMap} />);

    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("filters items when a tag is clicked", () => {
    render(<SectionIndexGrid items={items} locale="el" tags={allTags} tagMap={tagMap} />);

    fireEvent.click(screen.getByRole("button", { name: "Ear" }));

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute("href", "/el/otitis");
  });

  it("shows items matching multiple tags (union) when item has any selected tag", () => {
    render(<SectionIndexGrid items={items} locale="el" tags={allTags} tagMap={tagMap} />);

    fireEvent.click(screen.getByRole("button", { name: "Nose" }));

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(2);
    expect(links[0]).toHaveAttribute("href", "/el/rhinoplasty");
    expect(links[1]).toHaveAttribute("href", "/el/snoring");
  });

  it("deselects tag on second click to show all items again", () => {
    render(<SectionIndexGrid items={items} locale="el" tags={allTags} tagMap={tagMap} />);

    fireEvent.click(screen.getByRole("button", { name: "Ear" }));
    expect(screen.getAllByRole("link")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Ear" }));
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("does not render filter bar when no tags are provided", () => {
    const { container } = render(<SectionIndexGrid items={items} locale="el" />);

    expect(container.querySelector("button")).toBeNull();
  });
});
