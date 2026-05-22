import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { NavigationNodeDTO } from "@/lib/cms/types";

import { MegaMenu } from "./MegaMenu";

const topicsLabel = (count: number) => `${count} topics`;
const overviewLinkLabel = "Open section";
const sectionOverviewMoreHint = (hiddenCount: number) => `${hiddenCount} more inside`;

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
  layoutVariant: "standard",
  parentPage: null,
  externalUrl: null,
  tags: [],
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
      layoutVariant: "standard",
      parentPage: null,
      externalUrl: null,
      tags: [],
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
      layoutVariant: "standard",
      parentPage: null,
      externalUrl: null,
      tags: [],
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
          layoutVariant: "standard",
          parentPage: null,
          externalUrl: null,
          tags: [],
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
          layoutVariant: "standard",
          parentPage: null,
          externalUrl: null,
          tags: [],
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
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    expect(screen.getByRole("heading", { name: "Services" })).toBeDefined();
  });

  it("renders feature blurb", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb="We offer a comprehensive range of medical services."
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    expect(screen.getByText("We offer a comprehensive range of medical services.")).toBeDefined();
  });

  it("renders child links with correct labels", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    expect(screen.getByText("Consultation")).toBeDefined();
    expect(screen.getByText("Surgery")).toBeDefined();
    expect(screen.getAllByText("2 topics")).toHaveLength(2);
  });

  it("renders section count beside the overview link", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    const ctaRow = document.querySelector('[class*="nav-panel__cta-row"]') as HTMLElement;
    const ctaLink = screen.getByText("Open section").closest("a") as HTMLElement;

    expect(ctaRow.contains(ctaLink)).toBe(true);
    expect(ctaLink.querySelector('[class*="cta-arrow"]')?.textContent).toBe("→");
    expect(ctaRow).toHaveTextContent("2 topics");
    expect(screen.getByRole("heading", { name: "Services" }).nextElementSibling?.tagName).toBe("P");
  });

  it("animates the overview arrow on link hover", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    expect(
      screen.getByText("Open section").closest("a")?.querySelector('[class*="cta-arrow"]'),
    ).toBeTruthy();
  });

  it("renders a section overview text link for regular section hubs", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    expect(screen.getByText("Open section").closest("a")).toHaveAttribute("href", "/el/services");
  });

  it("does not render a section overview link for the homepage menu hub", () => {
    const menuItem: NavigationNodeDTO = {
      ...mockItem,
      slug: "index",
      href: "/el",
      navLabel: "Menu",
      children: mockItem.children.slice(0, 1),
    };

    render(
      <MegaMenu
        item={menuItem}
        featureBlurb={menuItem.excerpt!}
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    expect(screen.queryByRole("link", { name: /Open section/i })).toBeNull();
    expect(screen.getByRole("heading", { name: "Menu" }).nextElementSibling).toHaveTextContent(
      "1 topics",
    );
  });

  it("renders child count meta label for parent children", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    expect(screen.getByRole("link", { name: /Surgery/i })).toHaveTextContent("2 topics");
  });

  it("uses the provided localized count label for parent children", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel={overviewLinkLabel}
        topicsLabel={(count) => `${count} θέματα`}
      />,
    );

    expect(screen.getByRole("link", { name: /Surgery/i })).toHaveTextContent("2 θέματα");
  });

  it("renders excerpt meta text for leaf pages", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

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
          layoutVariant: "standard",
          parentPage: null,
          externalUrl: null,
          tags: [],
          children: [],
        },
      ],
    };

    render(
      <MegaMenu
        item={itemWithAltTitle}
        featureBlurb=""
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    expect(screen.getByText("Longer Alternative Title")).toBeDefined();
  });

  it("handles empty children gracefully", () => {
    const emptyItem: NavigationNodeDTO = { ...mockItem, children: [] };

    render(
      <MegaMenu
        item={emptyItem}
        featureBlurb=""
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    expect(screen.getByRole("heading", { name: "Services" })).toBeDefined();
    expect(screen.queryByText("0 topics")).toBeNull();
  });

  it("shows an overflow hint when more topics exist than the dropdown displays", () => {
    const overflowChildren = Array.from({ length: 15 }, (_, index) => ({
      ...mockItem.children[0]!,
      documentId: `overflow-${index}`,
      slug: `topic-${index}`,
      navLabel: `Topic ${index + 1}`,
      href: `/el/services/topic-${index}`,
    }));

    render(
      <MegaMenu
        item={{ ...mockItem, children: overflowChildren }}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    expect(screen.getByText("3 more inside")).toBeDefined();
    expect(screen.getByText("Topic 12")).toBeDefined();
    expect(screen.queryByText("Topic 13")).toBeNull();
  });

  it("does not show an overflow hint when all topics fit in the dropdown", () => {
    render(
      <MegaMenu
        item={mockItem}
        featureBlurb={mockItem.excerpt!}
        overviewLinkLabel={overviewLinkLabel}
        sectionOverviewMoreHint={sectionOverviewMoreHint}
        topicsLabel={topicsLabel}
      />,
    );

    expect(screen.queryByText(/more inside/i)).toBeNull();
  });
});
