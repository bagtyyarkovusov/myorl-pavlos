import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { NavigationNodeDTO } from "@/lib/cms/types";

import { NavigationAnchor } from "./NavigationAnchor";

const internalItem: NavigationNodeDTO = {
  documentId: "page-1",
  locale: "el",
  slug: "about",
  title: "About Us",
  navLabel: "About",
  menuTitle: null,
  excerpt: null,
  href: "/el/about",
  menuIndex: 0,
  hideFromMenu: false,
  isFolder: false,
  layoutVariant: "standard",
  parentPage: null,
  externalUrl: null,
  tags: [],
  children: [],
};

const externalItem: NavigationNodeDTO = {
  documentId: "ext-1",
  locale: "el",
  slug: "external",
  title: "External Site",
  navLabel: "External",
  menuTitle: null,
  excerpt: null,
  href: "https://example.com",
  menuIndex: 0,
  hideFromMenu: false,
  isFolder: false,
  layoutVariant: "standard",
  parentPage: null,
  externalUrl: null,
  tags: [],
  children: [],
};

describe("NavigationAnchor", () => {
  it("renders next/link for internal URLs", () => {
    render(<NavigationAnchor item={internalItem} />);
    const link = screen.getByText("About");
    expect(link.closest("a")?.getAttribute("href")).toBe("/el/about");
  });

  it("renders <a> with target=_blank for external URLs", () => {
    render(<NavigationAnchor item={externalItem} />);
    const link = screen.getByText("External");
    const a = link.closest("a");
    expect(a?.getAttribute("href")).toBe("https://example.com");
    expect(a?.getAttribute("target")).toBe("_blank");
    expect(a?.getAttribute("rel")).toBe("noreferrer");
  });

  it("renders children when provided", () => {
    render(
      <NavigationAnchor item={internalItem}>
        <span>Custom content</span>
      </NavigationAnchor>,
    );
    expect(screen.getByText("Custom content")).toBeDefined();
    expect(screen.queryByText("About")).toBeNull();
  });

  it("applies className prop", () => {
    render(<NavigationAnchor item={internalItem} className="custom-class" />);
    expect(screen.getByText("About").getAttribute("class")).toContain("custom-class");
  });

  it("fires onClick callback", () => {
    const onClick = vi.fn();
    render(<NavigationAnchor item={internalItem} onClick={onClick} />);
    fireEvent.click(screen.getByText("About"));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("fires onMouseEnter callback", () => {
    const onMouseEnter = vi.fn();
    render(<NavigationAnchor item={internalItem} onMouseEnter={onMouseEnter} />);
    fireEvent.mouseEnter(screen.getByText("About"));
    expect(onMouseEnter).toHaveBeenCalledTimes(1);
  });

  it("fires onFocus callback", () => {
    const onFocus = vi.fn();
    render(<NavigationAnchor item={internalItem} onFocus={onFocus} />);
    screen.getByText("About").focus();
    expect(onFocus).toHaveBeenCalledTimes(1);
  });
});
