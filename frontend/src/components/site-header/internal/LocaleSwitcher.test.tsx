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
  getServerSnapshot: () => ({}),
}));

const baseProps = {
  languageLabel: "Language",
  localeUnavailableLabel: "Unavailable in this language",
};

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/el");
    storeListeners = [];
    storeSnapshot = {};
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it("renders both locale options", () => {
    render(<LocaleSwitcher locale="el" {...baseProps} />);

    expect(screen.getByText("GR")).toBeDefined();
    expect(screen.getByText("RU")).toBeDefined();
  });

  it("sets aria-current on active locale", () => {
    render(<LocaleSwitcher locale="el" {...baseProps} />);

    const grOption = screen.getByText("GR");
    expect(grOption.getAttribute("aria-current")).toBe("page");
    expect(grOption.tagName).toBe("SPAN");

    const ruLink = screen.getByText("RU").closest("a");
    expect(ruLink).toBeTruthy();
    expect(ruLink?.getAttribute("aria-current")).toBeNull();
  });

  it("sets active locale on ru", () => {
    render(<LocaleSwitcher locale="ru" {...baseProps} />);

    const ruOption = screen.getByText("RU");
    expect(ruOption.getAttribute("aria-current")).toBe("page");

    const grLink = screen.getByText("GR").closest("a");
    expect(grLink).toBeTruthy();
  });

  it("links to homepage when on homepage", () => {
    mockUsePathname.mockReturnValue("/el");
    render(<LocaleSwitcher locale="el" {...baseProps} />);

    const ruLink = screen.getByText("RU").closest("a");
    expect(ruLink?.getAttribute("href")).toBe("/ru");
    expect(ruLink?.getAttribute("hreflang")).toBe("ru");
  });

  it("preserves current page path when switching locale", () => {
    mockUsePathname.mockReturnValue("/el/services");
    render(<LocaleSwitcher locale="el" {...baseProps} />);

    const ruLink = screen.getByText("RU").closest("a");
    expect(ruLink?.getAttribute("href")).toBe("/ru/services");
  });

  it("preserves nested paths when switching locale", () => {
    mockUsePathname.mockReturnValue("/ru/blog/my-article");
    render(<LocaleSwitcher locale="ru" {...baseProps} />);

    const grLink = screen.getByText("GR").closest("a");
    expect(grLink?.getAttribute("href")).toBe("/el/blog/my-article");
  });

  it("uses alternate URL when available for target locale", () => {
    storeSnapshot = { el: "/el/about", ru: "/ru/o-nas" };
    mockUsePathname.mockReturnValue("/el/about");
    render(<LocaleSwitcher locale="el" {...baseProps} />);

    const ruLink = screen.getByText("RU").closest("a");
    expect(ruLink?.getAttribute("href")).toBe("/ru/o-nas");
  });

  it("falls back to pathname swap when alternate URL not available yet", () => {
    storeSnapshot = {};
    mockUsePathname.mockReturnValue("/el/services");
    render(<LocaleSwitcher locale="el" {...baseProps} />);

    const ruLink = screen.getByText("RU").closest("a");
    expect(ruLink?.getAttribute("href")).toBe("/ru/services");
  });

  it("disables the other locale when the page has no localization partner", () => {
    storeSnapshot = { ru: "http://localhost:3000/ru/fillers" };
    mockUsePathname.mockReturnValue("/ru/fillers");
    render(<LocaleSwitcher locale="ru" {...baseProps} />);

    const switcher = screen.getByLabelText("Language");
    expect(switcher.getAttribute("data-limited")).toBe("true");

    const grOption = screen.getByText("GR");
    expect(grOption.tagName).toBe("SPAN");
    expect(grOption.getAttribute("aria-disabled")).toBe("true");
    expect(grOption.getAttribute("title")).toBe("Unavailable in this language");
    expect(grOption.closest("a")).toBeNull();
  });

  it("reacts to alternate URL store updates", () => {
    storeSnapshot = {};
    mockUsePathname.mockReturnValue("/el/about");
    render(<LocaleSwitcher locale="el" {...baseProps} />);

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
    render(<LocaleSwitcher locale="el" {...baseProps} />);
    expect(screen.getByLabelText("Language")).toBeDefined();
  });
});
