import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { NavigationNodeDTO } from "@/lib/cms/types";

import { MobileMenu } from "./MobileMenu";

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
  children: [],
};

function makeNode(
  documentId: string,
  navLabel: string,
  children: NavigationNodeDTO[] = [],
): NavigationNodeDTO {
  return {
    ...base,
    documentId,
    navLabel,
    title: navLabel,
    slug: documentId,
    href: `/el/${documentId}`,
    children,
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
    render(<MobileMenu items={items} overviewMobile="Overview" onNavigate={() => {}} />);

    expect(screen.getByText("About").closest("a")).toBeTruthy();
    expect(screen.getByText("Contact").closest("a")).toBeTruthy();
  });

  it("renders parent items with an accordion trigger button (closed by default)", () => {
    render(<MobileMenu items={items} overviewMobile="Overview" onNavigate={() => {}} />);

    const trigger = screen.getByRole("button", { name: /Services/ });
    expect(trigger).toBeTruthy();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
  });

  it("opens accordion on trigger click and shows children", () => {
    render(<MobileMenu items={items} overviewMobile="Overview" onNavigate={() => {}} />);

    const trigger = screen.getByRole("button", { name: /Services/ });
    fireEvent.click(trigger);

    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    expect(screen.getByText("Consultation")).toBeDefined();
    expect(screen.getByText("Surgery")).toBeDefined();
  });

  it("renders overview link inside accordion children", () => {
    render(<MobileMenu items={items} overviewMobile="Section overview" onNavigate={() => {}} />);

    const trigger = screen.getByRole("button", { name: /Services/ });
    fireEvent.click(trigger);

    const overviewLink = screen.getByText("Section overview");
    expect(overviewLink).toBeDefined();
    expect(overviewLink.closest("a")?.getAttribute("href")).toBe("/el/services");
  });

  it("fires onNavigate on leaf link click", () => {
    const onNavigate = vi.fn();

    render(<MobileMenu items={items} overviewMobile="Overview" onNavigate={onNavigate} />);

    fireEvent.click(screen.getByText("About"));
    expect(onNavigate).toHaveBeenCalledTimes(1);
  });

  it("renders empty when items list is empty", () => {
    const { container } = render(
      <MobileMenu items={[]} overviewMobile="Overview" onNavigate={() => {}} />,
    );

    expect(container.textContent).toBe("");
  });
});
