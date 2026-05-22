import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { NavigationNodeDTO } from "@/lib/cms/types";

import { MobileMenu } from "./MobileMenu";

const topicsLabel = (count: number) => `${count} topics`;
const overviewMobile = "Section overview";

const base: Omit<NavigationNodeDTO, "documentId" | "navLabel" | "href"> = {
  locale: "el",
  slug: "test",
  title: "Test",
  menuTitle: null,
  excerpt: null,
  menuIndex: 0,
  hideFromMenu: false,
  isFolder: false,
  layoutVariant: "standard",
  parentPage: null,
  externalUrl: null,
  tags: [],
  children: [],
};

function makeNode(
  documentId: string,
  navLabel: string,
  children: NavigationNodeDTO[] = [],
  overrides: Partial<NavigationNodeDTO> = {},
): NavigationNodeDTO {
  return {
    ...base,
    documentId,
    navLabel,
    title: navLabel,
    slug: documentId,
    href: `/el/${documentId}`,
    children,
    ...overrides,
  };
}

const items: NavigationNodeDTO[] = [
  makeNode("about", "About"),
  makeNode("services", "Services", [
    makeNode("consultation", "Consultation"),
    makeNode("surgery", "Surgery"),
  ]),
  makeNode("contact", "Contact"),
];

describe("MobileMenu", () => {
  it("renders leaf items as direct links", () => {
    render(
      <MobileMenu
        items={items}
        overviewMobile={overviewMobile}
        topicsLabel={topicsLabel}
        onNavigate={() => {}}
      />,
    );

    expect(screen.getByText("About").closest("a")).toBeTruthy();
    expect(screen.getByText("Contact").closest("a")).toBeTruthy();
  });

  it("renders parent items with an accordion trigger button (closed by default)", () => {
    render(
      <MobileMenu
        items={items}
        overviewMobile={overviewMobile}
        topicsLabel={topicsLabel}
        onNavigate={() => {}}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Services.*2 topics/i });
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    expect(screen.getAllByText("Services")).toHaveLength(1);
  });

  it("does not render parent excerpt as subtitle text", () => {
    const itemsWithExcerpt: NavigationNodeDTO[] = [
      {
        ...makeNode("services", "Services", [makeNode("consultation", "Consultation")]),
        excerpt: "Clinical services overview",
      },
    ];

    render(
      <MobileMenu
        items={itemsWithExcerpt}
        overviewMobile={overviewMobile}
        topicsLabel={topicsLabel}
        onNavigate={() => {}}
      />,
    );

    expect(screen.getByRole("button", { name: /Services.*1 topics/i })).toBeTruthy();
    expect(screen.queryByText("Clinical services overview")).toBeNull();
  });

  it("shows direct child count on accordion triggers", () => {
    render(
      <MobileMenu
        items={items}
        overviewMobile={overviewMobile}
        topicsLabel={topicsLabel}
        onNavigate={() => {}}
      />,
    );

    expect(screen.getByText("2 topics")).toBeTruthy();
  });

  it("opens accordion on trigger click and shows children", () => {
    render(
      <MobileMenu
        items={items}
        overviewMobile={overviewMobile}
        topicsLabel={topicsLabel}
        onNavigate={() => {}}
      />,
    );

    const trigger = screen.getByRole("button", { name: /Services.*2 topics/i });
    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Consultation")).toBeDefined();
    expect(screen.getByText("Surgery")).toBeDefined();
  });

  it("renders a section overview link for regular section hubs", () => {
    render(
      <MobileMenu
        items={items}
        overviewMobile={overviewMobile}
        topicsLabel={topicsLabel}
        onNavigate={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Services.*2 topics/i }));

    expect(screen.getByRole("link", { name: overviewMobile })).toHaveAttribute(
      "href",
      "/el/services",
    );
  });

  it("does not render a section overview link for the homepage menu hub", () => {
    const menuItems: NavigationNodeDTO[] = [
      makeNode("menu", "Menu", [makeNode("about", "About"), makeNode("contact", "Contact")], {
        slug: "index",
        href: "/el",
      }),
    ];

    render(
      <MobileMenu
        items={menuItems}
        overviewMobile={overviewMobile}
        topicsLabel={topicsLabel}
        onNavigate={() => {}}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Menu.*2 topics/i }));

    expect(screen.queryByText(overviewMobile)).toBeNull();
    expect(screen.getByText("About")).toBeDefined();
  });

  it("fires onNavigate on leaf link click", () => {
    const onNavigate = vi.fn();

    render(
      <MobileMenu
        items={items}
        overviewMobile={overviewMobile}
        topicsLabel={topicsLabel}
        onNavigate={onNavigate}
      />,
    );

    fireEvent.click(screen.getByText("About"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("renders empty when items list is empty", () => {
    const { container } = render(
      <MobileMenu
        items={[]}
        overviewMobile={overviewMobile}
        topicsLabel={topicsLabel}
        onNavigate={() => {}}
      />,
    );

    expect(container.textContent).toBe("");
  });
});
