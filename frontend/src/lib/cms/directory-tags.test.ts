import { describe, expect, it } from "vitest";

import { deriveDirectoryTagFilter, partitionDirectoryTags } from "./directory-tags";
import type { NavigationNodeDTO } from "./types";

function makeNode(
  slug: string,
  opts: { menuIndex?: number; tags?: NavigationNodeDTO["tags"] },
): NavigationNodeDTO {
  const menuIndex = opts.menuIndex ?? 0;
  const tags = opts.tags ?? [];
  return {
    documentId: `doc-${slug}`,
    locale: "el",
    slug,
    title: slug,
    menuTitle: null,
    navLabel: slug,
    menuIndex,
    hideFromMenu: false,
    parentPage: null,
    externalUrl: null,
    isFolder: false,
    layoutVariant: "standard",
    excerpt: null,
    featuredImage: null,
    imageCenter: null,
    tags,
    href: `/el/${slug}`,
    children: [],
  };
}

describe("deriveDirectoryTagFilter", () => {
  it("returns empty tags and empty slug arrays when children have no tags", () => {
    const children = [makeNode("a", { menuIndex: 1 }), makeNode("b", { menuIndex: 2 })];
    const { tags, tagMap } = deriveDirectoryTagFilter(children);

    expect(tags).toEqual([]);
    expect(tagMap).toEqual({
      "doc-a": [],
      "doc-b": [],
    });
  });

  it("orders unique tags by first appearance in menuIndex order", () => {
    const children = [
      makeNode("second", {
        menuIndex: 2,
        tags: [
          { name: "Zebra", slug: "zebra" },
          { name: "Apple", slug: "apple" },
        ],
      }),
      makeNode("first", {
        menuIndex: 1,
        tags: [{ name: "Apple", slug: "apple" }],
      }),
    ];

    const { tags, tagMap } = deriveDirectoryTagFilter(children);

    expect(tags.map((t) => t.slug)).toEqual(["apple", "zebra"]);
    expect(tagMap["doc-first"]).toEqual(["apple"]);
    expect(tagMap["doc-second"]).toEqual(["zebra", "apple"]);
  });

  it("dedupes the same slug across children", () => {
    const t = { name: "Shared", slug: "shared" };
    const children = [
      makeNode("one", { menuIndex: 1, tags: [t] }),
      makeNode("two", { menuIndex: 2, tags: [t] }),
    ];

    const { tags } = deriveDirectoryTagFilter(children);
    expect(tags).toHaveLength(1);
    expect(tags[0]).toEqual(t);
  });
});

describe("partitionDirectoryTags", () => {
  it("splits tags into four primary and the rest secondary", () => {
    const tags = Array.from({ length: 6 }, (_, index) => ({
      name: `Tag ${index + 1}`,
      slug: `tag-${index + 1}`,
    }));

    const { primary, secondary } = partitionDirectoryTags(tags);

    expect(primary).toHaveLength(4);
    expect(secondary).toHaveLength(2);
  });

  it("deprioritizes procedure-category tags on section-index hubs", () => {
    const tags = [
      { name: "Επεμβάσεις", slug: "procedures" },
      { name: "Ρινός", slug: "nose" },
      { name: "Αυτί", slug: "ear" },
      { name: "Λάρυγγας", slug: "larynx" },
      { name: "Φάρυγγας", slug: "pharynx" },
    ];

    const { primary } = partitionDirectoryTags(tags, "section-index");

    expect(primary.map((tag) => tag.slug)).not.toContain("procedures");
    expect(primary).toHaveLength(4);
  });
});
