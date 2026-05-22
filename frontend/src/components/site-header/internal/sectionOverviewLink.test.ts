import { describe, expect, it } from "vitest";

import type { NavigationNodeDTO } from "@/lib/cms/types";

import { showsSectionOverviewLink } from "./sectionOverviewLink";

const base: NavigationNodeDTO = {
  documentId: "base",
  locale: "ru",
  slug: "test",
  title: "Test",
  navLabel: "Test",
  menuTitle: null,
  excerpt: null,
  href: "/ru/test",
  menuIndex: 0,
  hideFromMenu: false,
  isFolder: false,
  layoutVariant: "standard",
  parentPage: null,
  externalUrl: null,
  tags: [],
  children: [],
};

describe("showsSectionOverviewLink", () => {
  it("returns false when the section links to the locale homepage", () => {
    expect(
      showsSectionOverviewLink({
        ...base,
        slug: "index",
        href: "/ru",
        navLabel: "Меню",
      }),
    ).toBe(false);
  });

  it("returns true for regular section hubs", () => {
    expect(
      showsSectionOverviewLink({
        ...base,
        slug: "bolezni",
        href: "/ru/bolezni",
        navLabel: "Болезни",
      }),
    ).toBe(true);
  });
});
