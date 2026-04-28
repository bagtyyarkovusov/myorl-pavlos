import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { NavigationNodeDTO } from "@/lib/cms/types";

import { MegaMenu } from "./MegaMenu";

const mockItem: NavigationNodeDTO = {
  documentId: "menu-1",
  locale: "el",
  slug: "services",
  title: "Medical Services",
  navLabel: "Services",
  menuTitle: null,
  excerpt: "We offer a comprehensive range of medical services.",
  href: "/el/services",
  menuIndex: 0,
  hideFromMenu: false,
  isFolder: true,
  parentPage: null,
  externalUrl: null,
  children: [
    {
      documentId: "child-1",
      locale: "el",
      slug: "consultation",
      title: "Consultation",
      navLabel: "Consultation",
      menuTitle: null,
      excerpt: "Initial consultation services.",
      href: "/el/services/consultation",
      menuIndex: 0,
      hideFromMenu: false,
      isFolder: false,
      parentPage: null,
      externalUrl: null,
      children: [],
    },
    {
      documentId: "child-2",
      locale: "el",
      slug: "surgery",
      title: "Surgery Overview",
      navLabel: "Surgery",
      menuTitle: null,
      excerpt: null,
      href: "/el/services/surgery",
      menuIndex: 1,
      hideFromMenu: false,
      isFolder: true,
      parentPage: null,
      externalUrl: null,
      children: [
        {
          documentId: "grandchild-1",
          locale: "el",
          slug: "ent-surgery",
          title: "ENT Surgery",
          navLabel: "ENT Surgery",
          menuTitle: null,
          excerpt: null,
          href: "/el/services/surgery/ent",
          menuIndex: 0,
          hideFromMenu: false,
          isFolder: false,
          parentPage: null,
          externalUrl: null,
          children: [],
        },
        {
          documentId: "grandchild-2",
          locale: "el",
          slug: "head-neck",
          title: "Head & Neck",
          navLabel: "Head & Neck",
          menuTitle: null,
          excerpt: null,
          href: "/el/services/surgery/head-neck",
          menuIndex: 1,
          hideFromMenu: false,
          isFolder: false,
          parentPage: null,
          externalUrl: null,
          children: [],
        },
      ],
    },
  ],
};

describe("MegaMenu", () => {
  it("renders navLabel heading", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel="Overview"
        overviewLinkHref="/el/services"
      />,
    );

    expect(screen.getByRole("heading", { name: "Services" })).toBeDefined();
  });

  it("renders feature blurb", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb="We offer a comprehensive range of medical services."
        overviewLinkLabel="Overview"
        overviewLinkHref="/el/services"
      />,
    );

    expect(screen.getByText("We offer a comprehensive range of medical services.")).toBeDefined();
  });

  it("renders child links with correct labels", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel="Overview"
        overviewLinkHref="/el/services"
      />,
    );

    // Only direct children render; grandchildren show as count meta
    expect(screen.getByText("Consultation")).toBeDefined();
    expect(screen.getByText("Surgery")).toBeDefined();
    // Grandchildren (ENT Surgery, Head & Neck) shown only as "2 topics" meta
    expect(screen.getByText("2 topics")).toBeDefined();
  });

  it("renders section overview link", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel="Section overview"
        overviewLinkHref="/el/services"
      />,
    );

    const overviewLink = screen.getByText("Section overview");
    expect(overviewLink).toBeDefined();
    expect(overviewLink.closest("a")?.getAttribute("href")).toBe("/el/services");
  });

  it("renders child count meta label for parent children", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel="Overview"
        overviewLinkHref="/el/services"
      />,
    );

    // Surgery has 2 children, leafMetaLabel should show count
    expect(screen.getByText("2 topics")).toBeDefined();
  });

  it("renders excerpt meta text for leaf pages", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel="Overview"
        overviewLinkHref="/el/services"
      />,
    );

    // Consultation has excerpt
    expect(screen.getByText("Initial consultation services.")).toBeDefined();
  });

  it("renders alternate title when title !== navLabel", () => {
    const itemWithAltTitle: NavigationNodeDTO = {
      ...mockItem,
      children: [
        {
          documentId: "child-alt",
          locale: "el",
          slug: "test",
          title: "Longer Alternative Title",
          navLabel: "Short",
          menuTitle: null,
          excerpt: null,
          href: "/el/test",
          menuIndex: 0,
          hideFromMenu: false,
          isFolder: false,
          parentPage: null,
          externalUrl: null,
          children: [],
        },
      ],
    };

    render(
      <MegaMenu
        item={itemWithAltTitle}
        featureBlurb=""
        overviewLinkLabel="Overview"
        overviewLinkHref="/el/test"
      />,
    );

    expect(screen.getByText("Longer Alternative Title")).toBeDefined();
  });

  it("handles null children gracefully", () => {
    const emptyItem: NavigationNodeDTO = { ...mockItem, children: [] };

    render(
      <MegaMenu
        item={emptyItem}
        featureBlurb=""
        overviewLinkLabel="Overview"
        overviewLinkHref="/el/test"
      />,
    );

    // Should not crash; overview link still renders
    expect(screen.getByText("Overview")).toBeDefined();
  });
});
