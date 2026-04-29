import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { DesktopNav } from "./DesktopNav";

const items = [
  {
    documentId: "item-1",
    locale: "el" as const,
    slug: "about",
    title: "About",
    navLabel: "About",
    menuTitle: null,
    excerpt: null,
    href: "/el/about",
    menuIndex: 0,
    hideFromMenu: false,
    isFolder: false,
    parentPage: null,
    externalUrl: null,
    children: [],
  },
  {
    documentId: "item-2",
    locale: "el" as const,
    slug: "services",
    title: "Services",
    navLabel: "Services",
    menuTitle: null,
    excerpt: "Medical services overview",
    href: "/el/services",
    menuIndex: 1,
    hideFromMenu: false,
    isFolder: true,
    parentPage: null,
    externalUrl: null,
    children: [
      {
        documentId: "child-1",
        locale: "el" as const,
        slug: "consultation",
        title: "Consultation",
        navLabel: "Consultation",
        menuTitle: null,
        excerpt: null,
        href: "/el/services/consultation",
        menuIndex: 0,
        hideFromMenu: false,
        isFolder: false,
        parentPage: null,
        externalUrl: null,
        children: [],
      },
    ],
  },
];

const baseProps = {
  items,
  pillStyle: { width: 0, left: 0, opacity: 0 },
  openMenuId: null,
  onItemHover: vi.fn(),
  onHoverClear: vi.fn(),
  onMenuOpen: vi.fn(),
  onMenuClose: vi.fn(),
  registerPillRect: vi.fn(),
  overviewLinkLabel: "Overview",
  featureBlurb: "",
  primaryNavLabel: "Main navigation",
};

describe("DesktopNav", () => {
  it("renders navigation with aria-label", () => {
    render(<DesktopNav {...baseProps} />);
    expect(screen.getByLabelText("Main navigation")).toBeDefined();
  });

  it("renders all nav item labels", () => {
    render(<DesktopNav {...baseProps} />);
    expect(screen.getByText("About")).toBeDefined();
    expect(screen.getByText("Services")).toBeDefined();
  });

  it("renders magnetic pill with correct style", () => {
    render(<DesktopNav {...baseProps} pillStyle={{ width: 120, left: 200, opacity: 1 }} />);
    const pill = document.querySelector('[class*="nav-magnetic-pill"]') as HTMLElement;
    expect(pill.style.width).toBe("120px");
    expect(pill.style.transform).toBe("translateX(200px)");
    expect(pill.style.opacity).toBe("1");
  });

  it("renders parent items as buttons with chevron", () => {
    render(<DesktopNav {...baseProps} />);
    const button = screen.getByRole("button", { name: /Services/ });
    expect(button).toBeDefined();
    expect(button.getAttribute("aria-haspopup")).toBe("true");
  });

  it("sets aria-expanded on open parent item", () => {
    render(<DesktopNav {...baseProps} openMenuId="item-2" />);
    const button = screen.getByRole("button", { name: /Services/ });
    expect(button.getAttribute("aria-expanded")).toBe("true");
  });

  it("sets aria-expanded false on closed parent item", () => {
    render(<DesktopNav {...baseProps} openMenuId={null} />);
    const button = screen.getByRole("button", { name: /Services/ });
    expect(button.getAttribute("aria-expanded")).toBe("false");
  });

  it("calls onItemHover and onMenuOpen on parent mouse enter", () => {
    const onItemHover = vi.fn();
    const onMenuOpen = vi.fn();
    render(<DesktopNav {...baseProps} onItemHover={onItemHover} onMenuOpen={onMenuOpen} />);

    const navItem = document.querySelector('[data-id="item-2"]') as HTMLElement;
    fireEvent.mouseEnter(navItem);
    expect(onItemHover).toHaveBeenCalledWith("item-2");
    expect(onMenuOpen).toHaveBeenCalledWith("item-2");
  });

  it("calls onItemHover on leaf item mouse enter", () => {
    const onItemHover = vi.fn();
    render(<DesktopNav {...baseProps} onItemHover={onItemHover} />);

    const navItem = document.querySelector('[data-id="item-1"]') as HTMLElement;
    fireEvent.mouseEnter(navItem);
    expect(onItemHover).toHaveBeenCalledWith("item-1");
  });

  it("calls onMenuClose on parent button click when open", () => {
    const onMenuClose = vi.fn();
    render(<DesktopNav {...baseProps} openMenuId="item-2" onMenuClose={onMenuClose} />);

    fireEvent.click(screen.getByRole("button", { name: /Services/ }));
    expect(onMenuClose).toHaveBeenCalled();
  });

  it("calls onMenuOpen on parent button click when closed", () => {
    const onMenuOpen = vi.fn();
    render(<DesktopNav {...baseProps} openMenuId={null} onMenuOpen={onMenuOpen} />);

    fireEvent.click(screen.getByRole("button", { name: /Services/ }));
    expect(onMenuOpen).toHaveBeenCalledWith("item-2");
  });

  it("calls onHoverClear on nav mouseLeave", () => {
    const onHoverClear = vi.fn();
    render(<DesktopNav {...baseProps} onHoverClear={onHoverClear} />);

    fireEvent.mouseLeave(screen.getByLabelText("Main navigation"));
    expect(onHoverClear).toHaveBeenCalled();
  });

  it("calls onMenuClose on megamenu-host mouseLeave", () => {
    const onMenuClose = vi.fn();
    render(<DesktopNav {...baseProps} onMenuClose={onMenuClose} />);

    const host = document.querySelector('[class*="megamenu-host"]') as HTMLElement;
    fireEvent.mouseLeave(host);
    expect(onMenuClose).toHaveBeenCalled();
  });

  it("shows MegaMenu panel when menu is open", () => {
    render(<DesktopNav {...baseProps} openMenuId="item-2" />);

    const panel = document.querySelector('[class*="megamenu-panel"]') as HTMLElement;
    expect(panel.getAttribute("data-open")).toBe("true");
    expect(panel.getAttribute("aria-hidden")).toBe("false");
    expect(screen.getByText("Overview")).toBeDefined();
  });

  it("hides MegaMenu panel when no menu is open", () => {
    render(<DesktopNav {...baseProps} openMenuId={null} />);

    const panel = document.querySelector('[class*="megamenu-panel"]') as HTMLElement;
    expect(panel.getAttribute("data-open")).toBe("false");
    expect(panel.getAttribute("aria-hidden")).toBe("true");
  });
});
