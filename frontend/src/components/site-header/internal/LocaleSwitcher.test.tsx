import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { act } from "react";

import { LocaleSwitcher } from "./LocaleSwitcher";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

let storeListeners: Array<() => void> = [];
let storeSnapshot: Record<string, string> = {};

vi.mock("@/lib/i18n/alternate-url-store", () => ({
  subscribe: (fn: () => void) => {
    storeListeners.push(fn);
    return () => {
      storeListeners = storeListeners.filter((l) => l !== fn);
    };
  },
  getSnapshot: () => storeSnapshot,
}));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/el");
    storeListeners = [];
    storeSnapshot = {};
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders both locale links", () => {
    render(<LocaleSwitcher locale="el" languageLabel="Language" />);

    const grLink = screen.getByText("GR");
    const ruLink = screen.getByText("RU");
    expect(grLink).toBeDefined();
    expect(ruLink).toBeDefined();
  });

  it("sets aria-current on active locale", () => {
    render(<LocaleSwitcher locale="el" languageLabel="Language" />);

    const grLink = screen.getByText("GR");
    expect(grLink.getAttribute("aria-current")).toBe("page");

    const ruLink = screen.getByText("RU");
    expect(ruLink.getAttribute("aria-current")).toBeNull();
  });

  it("sets active locale on ru", () => {
    render(<LocaleSwitcher locale="ru" languageLabel="Language" />);

    const ruLink = screen.getByText("RU");
    expect(ruLink.getAttribute("aria-current")).toBe("page");

    const grLink = screen.getByText("GR");
    expect(grLink.getAttribute("aria-current")).toBeNull();
  });

  it("links to homepage when on homepage", () => {
    mockUsePathname.mockReturnValue("/el");
    render(<LocaleSwitcher locale="el" languageLabel="Language" />);

    const grLink = screen.getByText("GR").closest("a");
    expect(grLink?.getAttribute("href")).toBe("/el");
    expect(grLink?.getAttribute("hreflang")).toBe("el");

    const ruLink = screen.getByText("RU").closest("a");
    expect(ruLink?.getAttribute("href")).toBe("/ru");
    expect(ruLink?.getAttribute("hreflang")).toBe("ru");
  });

  it("preserves current page path when switching locale", () => {
    mockUsePathname.mockReturnValue("/el/services");
    render(<LocaleSwitcher locale="el" languageLabel="Language" />);

    const grLink = screen.getByText("GR").closest("a");
    expect(grLink?.getAttribute("href")).toBe("/el/services");

    const ruLink = screen.getByText("RU").closest("a");
    expect(ruLink?.getAttribute("href")).toBe("/ru/services");
  });

  it("preserves nested paths when switching locale", () => {
    mockUsePathname.mockReturnValue("/ru/blog/my-article");
    render(<LocaleSwitcher locale="ru" languageLabel="Language" />);

    const grLink = screen.getByText("GR").closest("a");
    expect(grLink?.getAttribute("href")).toBe("/el/blog/my-article");

    const ruLink = screen.getByText("RU").closest("a");
    expect(ruLink?.getAttribute("href")).toBe("/ru/blog/my-article");
  });

  it("uses alternate URL when available for target locale", () => {
    storeSnapshot = { el: "/el/about", ru: "/ru/o-nas" };
    mockUsePathname.mockReturnValue("/el/about");
    render(<LocaleSwitcher locale="el" languageLabel="Language" />);

    const grLink = screen.getByText("GR").closest("a");
    expect(grLink?.getAttribute("href")).toBe("/el/about");

    const ruLink = screen.getByText("RU").closest("a");
    expect(ruLink?.getAttribute("href")).toBe("/ru/o-nas");
  });

  it("falls back to pathname swap when alternate URL not available", () => {
    storeSnapshot = {};
    mockUsePathname.mockReturnValue("/el/services");
    render(<LocaleSwitcher locale="el" languageLabel="Language" />);

    const ruLink = screen.getByText("RU").closest("a");
    expect(ruLink?.getAttribute("href")).toBe("/ru/services");
  });

  it("reacts to alternate URL store updates", () => {
    storeSnapshot = {};
    mockUsePathname.mockReturnValue("/el/about");
    render(<LocaleSwitcher locale="el" languageLabel="Language" />);

    const ruLinkBefore = screen.getByText("RU").closest("a");
    expect(ruLinkBefore?.getAttribute("href")).toBe("/ru/about");

    act(() => {
      storeSnapshot = { el: "/el/about", ru: "/ru/o-nas" };
      for (const fn of storeListeners) fn();
    });

    const ruLinkAfter = screen.getByText("RU").closest("a");
    expect(ruLinkAfter?.getAttribute("href")).toBe("/ru/o-nas");
  });

  it("sets aria-label on container", () => {
    render(<LocaleSwitcher locale="el" languageLabel="Language" />);
    const container = screen.getByLabelText("Language");
    expect(container).toBeDefined();
  });
});
