import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent, within } from "@testing-library/react";

import { SectionIndexGrid } from "./SectionIndexGrid";
import type { NavigationNodeDTO } from "@/lib/cms/types";
import type { LayoutVariant } from "@/lib/cms/types";
import type { TagDTO } from "@/lib/cms/types/tag";
import type { SeoDTO } from "@/lib/cms/types/seo";

const mockSearchParams = vi.fn(() => new URLSearchParams());

vi.mock("next/navigation", () => ({
  useSearchParams: () => mockSearchParams(),
}));

beforeEach(() => {
  mockSearchParams.mockReturnValue(new URLSearchParams());
});

function makeSeo(overrides: Partial<SeoDTO> = {}): SeoDTO {
  return {
    metaTitle: null,
    metaDescription: null,
    canonicalUrl: null,
    ogImage: null,
    robotsNoindex: false,
    robotsNofollow: false,
    sitemapExclude: false,
    sitemapPriority: null,
    sitemapChangeFrequency: null,
    ...overrides,
  };
}

function makeChild(
  slug: string,
  label: string,
  opts: {
    menuIndex?: number;
    excerpt?: string | null;
    imageUrl?: string | null;
    tags?: TagDTO[];
    externalUrl?: string | null;
    seo?: SeoDTO | null;
    href?: string;
  } = {},
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
    externalUrl: opts.externalUrl ?? null,
    isFolder: false,
    layoutVariant: "standard",
    excerpt: opts.excerpt ?? null,
    featuredImage: opts.imageUrl
      ? { url: opts.imageUrl, alternativeText: label, width: 1200, height: 800 }
      : null,
    imageCenter: null,
    seo: opts.seo ?? null,
    tags: opts.tags ?? [],
    href: opts.href ?? `/el/${slug}`,
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

  it("does not render row arrows on encyclopedia list items", () => {
    const children = [makeChild("item", "Item", { imageUrl: "/img/item.jpg" })];

    const { container } = render(
      <SectionIndexGrid items={children} locale="el" variant="encyclopedia-index" />,
    );

    expect(container.querySelector('[class*="index-row__arrow"]')).toBeNull();
  });

  it("renders left-aligned thumbnails for encyclopedia list items with media", () => {
    const children = [makeChild("item", "Item", { imageUrl: "/img/item.jpg" })];

    render(<SectionIndexGrid items={children} locale="el" variant="encyclopedia-index" />);

    const link = screen.getByRole("link", { name: /Item/i });
    expect(link).toHaveAttribute("data-has-media", "true");
    expect(link.querySelector('[data-media-variant="encyclopedia-list"] img')).toBeTruthy();
  });

  it("renders clinic index rows with the hairline list layout", () => {
    const children = [makeChild("clinic", "Athens Clinic", { imageUrl: "/img/clinic.jpg" })];

    render(<SectionIndexGrid items={children} locale="ru" variant="clinic-index" />);

    expect(document.querySelector('[data-index-variant="clinic-grid"]')).toBeTruthy();
    expect(document.querySelector('[class*="index-list--clinic-grid"]')).toBeTruthy();

    const link = screen.getByRole("link", { name: /Athens Clinic/i });
    expect(link).toHaveAttribute("data-has-media", "true");
    expect(link.querySelector('[data-media-variant="clinic-grid"] img')).toBeTruthy();
    expect(link.querySelector('[class*="index-row__arrow"]')).toBeNull();
  });

  it("uses seo fallbacks and external link attributes for clinic rows", () => {
    const children = [
      makeChild("mediterraneo", "Mediterraneo", {
        externalUrl: "http://www.mediterraneohospital.gr/",
        href: "http://www.mediterraneohospital.gr/",
        excerpt: null,
        seo: makeSeo({
          metaDescription: "Private hospital partner in Athens",
          ogImage: {
            url: "/uploads/mediterraneo.jpg",
            alternativeText: "Mediterraneo",
            width: null,
            height: null,
          },
        }),
      }),
    ];

    render(<SectionIndexGrid items={children} locale="ru" variant="clinic-index" />);

    const link = screen.getByRole("link", { name: /Mediterraneo/i });
    expect(link).toHaveAttribute("href", "http://www.mediterraneohospital.gr/");
    expect(link).toHaveAttribute("target", "_blank");
    expect(link).toHaveAttribute("rel", "noreferrer");
    expect(screen.getByText("Private hospital partner in Athens")).toBeDefined();
    expect(link.querySelector('[data-media-variant="clinic-grid"] img')).toBeTruthy();
  });

  it("renders encyclopedia article tags as category cues", () => {
    const children = [
      makeChild("epistaksi", "Ρινορραγία", {
        tags: [
          { name: "Ρινός", slug: "rinos" },
          { name: "Επεμβάσεις", slug: "epemvaseis" },
        ],
      }),
    ];

    render(<SectionIndexGrid items={children} locale="el" variant="encyclopedia-index" />);

    expect(screen.getByText("Ρινός")).toBeDefined();
    expect(screen.getByText("Επεμβάσεις")).toBeDefined();
  });
});

describe("SectionIndexGrid variants", () => {
  it.each([
    ["section-index", "section-grid"],
    ["clinic-index", "clinic-grid"],
    ["encyclopedia-index", "encyclopedia-list"],
    ["video-index", "video-grid"],
  ] as Array<[LayoutVariant, string]>)(
    "renders %s with its directory variant",
    (variant, expectedVariant) => {
      const children = [
        makeChild("first", "First", { imageUrl: "/img/first.jpg" }),
        makeChild("second", "Second", { imageUrl: "/img/second.jpg" }),
      ];

      render(<SectionIndexGrid items={children} locale="el" variant={variant} />);

      expect(document.querySelector(`[data-index-variant="${expectedVariant}"]`)).toBeTruthy();
    },
  );

  it("renders video index cards with play overlays", () => {
    const children = [makeChild("video", "Video Visit", { imageUrl: "/img/video.jpg" })];

    render(<SectionIndexGrid items={children} locale="el" variant="video-index" />);

    expect(screen.getByLabelText("Play video")).toBeDefined();
  });

  it("shows the first 12 list items and a pagination control when more children exist", () => {
    const children = Array.from({ length: 16 }, (_, index) =>
      makeChild(`item-${index + 1}`, `Item ${index + 1}`, { menuIndex: index + 1 }),
    );

    render(<SectionIndexGrid items={children} locale="el" variant="section-index" />);

    expect(screen.getAllByRole("link")).toHaveLength(15);
    expect(screen.getByRole("button", { name: "Περισσότερα (+1)" })).toBeDefined();
    expect(screen.queryByRole("link", { name: /Item 16/ })).toBeNull();
  });

  it("loads the next page of children on demand", () => {
    const children = Array.from({ length: 16 }, (_, index) =>
      makeChild(`item-${index + 1}`, `Item ${index + 1}`, { menuIndex: index + 1 }),
    );

    render(<SectionIndexGrid items={children} locale="el" variant="section-index" />);

    fireEvent.click(screen.getByRole("button", { name: "Περισσότερα (+1)" }));

    expect(screen.getAllByRole("link")).toHaveLength(16);
    expect(screen.getByRole("link", { name: /Item 16/ })).toHaveAttribute("href", "/el/item-16");
  });

  it("paginates encyclopedia indexes with URL links", () => {
    const children = Array.from({ length: 16 }, (_, index) =>
      makeChild(`item-${index + 1}`, `Item ${index + 1}`, { menuIndex: index + 1 }),
    );

    mockSearchParams.mockReturnValue(new URLSearchParams("page=2"));

    render(
      <SectionIndexGrid
        items={children}
        locale="el"
        variant="encyclopedia-index"
        indexHref="/el/orl-egkyklopaidia"
      />,
    );

    expect(screen.queryByRole("link", { name: /^Item 1$/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Item 13/ })).toHaveAttribute("href", "/el/item-13");
    expect(screen.queryByRole("button", { name: /Περισσότερα/ })).toBeNull();
    expect(screen.getByRole("navigation", { name: "Σελίδες" })).toBeDefined();
    expect(screen.getByRole("link", { name: "1" })).toHaveAttribute(
      "href",
      "/el/orl-egkyklopaidia",
    );
    expect(screen.getByRole("link", { name: "Πρώτη" })).toHaveAttribute(
      "href",
      "/el/orl-egkyklopaidia",
    );
  });

  it("uses URL-backed tag filters on encyclopedia indexes", () => {
    const tags: TagDTO[] = [{ name: "Nose", slug: "nose" }];
    const children = [
      makeChild("rhinoplasty", "Rhinoplasty", { tags, menuIndex: 1 }),
      makeChild("otitis", "Otitis", { tags: [{ name: "Ear", slug: "ear" }], menuIndex: 2 }),
    ];
    const tagMap: Record<string, string[]> = {
      "doc-rhinoplasty": ["nose"],
      "doc-otitis": ["ear"],
    };

    mockSearchParams.mockReturnValue(new URLSearchParams("tag=nose"));

    render(
      <SectionIndexGrid
        items={children}
        locale="el"
        variant="encyclopedia-index"
        indexHref="/el/orl-egkyklopaidia"
        tags={tags}
        tagMap={tagMap}
      />,
    );

    expect(screen.getByRole("link", { name: "Όλα" })).toHaveAttribute(
      "href",
      "/el/orl-egkyklopaidia",
    );
    expect(screen.getByRole("link", { name: "Nose" })).toHaveAttribute(
      "href",
      "/el/orl-egkyklopaidia?tag=nose",
    );
    expect(screen.getByRole("link", { name: /Rhinoplasty/ })).toBeDefined();
    expect(screen.queryByRole("link", { name: /Otitis/ })).toBeNull();
  });

  it("renders an empty state with a back link when there are no children", () => {
    render(<SectionIndexGrid items={[]} locale="el" variant="section-index" backHref="/el" />);

    expect(screen.getByText("Δεν υπάρχουν ακόμη διαθέσιμες σελίδες.")).toBeDefined();
    expect(screen.getByRole("link", { name: "Επιστροφή στην επισκόπηση" })).toHaveAttribute(
      "href",
      "/el",
    );
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

    expect(screen.getByRole("button", { name: "Όλα" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Nose" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ear" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Throat" })).toBeDefined();
  });

  it("hides secondary filters behind a disclosure when more than four tags exist", () => {
    const manyTags: TagDTO[] = [
      { name: "One", slug: "one" },
      { name: "Two", slug: "two" },
      { name: "Three", slug: "three" },
      { name: "Four", slug: "four" },
      { name: "Five", slug: "five" },
    ];

    render(<SectionIndexGrid items={items} locale="el" tags={manyTags} tagMap={{}} />);

    const primaryToolbar = screen.getAllByRole("toolbar")[0]!;
    expect(within(primaryToolbar).getByRole("button", { name: "Όλα" })).toBeDefined();
    expect(within(primaryToolbar).getByRole("button", { name: "One" })).toBeDefined();
    expect(within(primaryToolbar).queryByRole("button", { name: "Five" })).toBeNull();
    expect(screen.getByText("Περισσότερα φίλτρα")).toBeDefined();
  });

  it("renders featured cards and a compact list for section-index hubs", () => {
    const children = Array.from({ length: 5 }, (_, index) =>
      makeChild(`item-${index + 1}`, `Item ${index + 1}`, {
        menuIndex: index + 1,
        imageUrl: "/img/item.jpg",
      }),
    );

    render(<SectionIndexGrid items={children} locale="el" variant="section-index" />);

    expect(screen.getByText("Ξεκινήστε εδώ")).toBeDefined();
    expect(screen.getByText("Όλες οι εξετάσεις")).toBeDefined();
    expect(screen.getAllByRole("link")).toHaveLength(5);
    expect(document.querySelector('[class*="index-list--directory-list"]')).toBeTruthy();
    expect(document.querySelectorAll('[class*="index-row-link--directory"]')).toHaveLength(2);
  });

  it("renders directory-list class and placeholder media for text-only items", () => {
    const children = [
      ...Array.from({ length: 3 }, (_, index) =>
        makeChild(`featured-${index + 1}`, `Featured ${index + 1}`, {
          menuIndex: index + 1,
          imageUrl: "/img/featured.jpg",
        }),
      ),
      makeChild("text-only", "Text Only Exam", {
        menuIndex: 4,
        excerpt: "No image available",
      }),
    ];

    render(<SectionIndexGrid items={children} locale="el" variant="section-index" />);

    const directoryList = document.querySelector('[class*="index-list--directory-list"]');
    expect(directoryList).toBeTruthy();

    const textOnlyLink = screen.getByRole("link", { name: /Text Only Exam/i });
    expect(textOnlyLink.className).toMatch(/index-row-link--directory/);

    const placeholder = textOnlyLink.querySelector(
      '[data-media-variant="directory-list"][data-media-placeholder]',
    );
    expect(placeholder).toBeTruthy();
    expect(placeholder?.querySelector("img")).toBeNull();
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

  it("shows a localized empty state when a filter matches nothing", () => {
    render(<SectionIndexGrid items={items} locale="el" tags={allTags} tagMap={{}} />);

    fireEvent.click(screen.getByRole("button", { name: "Ear" }));

    expect(screen.getByText("Δεν βρέθηκαν αποτελέσματα για αυτό το φίλτρο.")).toBeDefined();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it('clears the active tag via the "Όλα" chip or clear action', () => {
    render(<SectionIndexGrid items={items} locale="el" tags={allTags} tagMap={tagMap} />);

    fireEvent.click(screen.getByRole("button", { name: "Ear" }));
    expect(screen.getAllByRole("link")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Όλα" }));
    expect(screen.getAllByRole("link")).toHaveLength(4);

    fireEvent.click(screen.getByRole("button", { name: "Nose" }));
    fireEvent.click(screen.getByRole("button", { name: "Εμφάνιση όλων" }));
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("deselects tag on second click to show all items again", () => {
    render(<SectionIndexGrid items={items} locale="el" tags={allTags} tagMap={tagMap} />);

    fireEvent.click(screen.getByRole("button", { name: "Ear" }));
    expect(screen.getAllByRole("link")).toHaveLength(1);

    fireEvent.click(screen.getByRole("button", { name: "Ear" }));
    expect(screen.getAllByRole("link")).toHaveLength(4);
  });

  it("resets pagination when the active filter changes", () => {
    const manyNoseItems = Array.from({ length: 13 }, (_, index) =>
      makeChild(`nose-${index + 1}`, `Nose ${index + 1}`, { menuIndex: index + 1 }),
    );
    const manyTagMap = Object.fromEntries(manyNoseItems.map((item) => [item.documentId, ["nose"]]));
    manyTagMap["doc-otitis"] = ["ear"];

    render(
      <SectionIndexGrid
        items={[...manyNoseItems, makeChild("otitis", "Otitis", { menuIndex: 99 })]}
        locale="el"
        tags={allTags}
        tagMap={manyTagMap}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Nose" }));
    fireEvent.click(screen.getByRole("button", { name: "Περισσότερα (+1)" }));
    expect(screen.getAllByRole("link")).toHaveLength(13);

    fireEvent.click(screen.getByRole("button", { name: "Ear" }));
    expect(screen.getAllByRole("link")).toHaveLength(1);
  });

  it("does not render filter bar when no tags are provided", () => {
    const { container } = render(<SectionIndexGrid items={items} locale="el" />);

    expect(container.querySelector("button")).toBeNull();
  });
});
