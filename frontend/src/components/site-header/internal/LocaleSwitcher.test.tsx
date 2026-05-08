import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";

import { LocaleSwitcher } from "./LocaleSwitcher";

const mockUsePathname = vi.fn();

vi.mock("next/navigation", () => ({
  usePathname: () => mockUsePathname(),
}));

describe("LocaleSwitcher", () => {
  beforeEach(() => {
    mockUsePathname.mockReturnValue("/el");
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

  it("sets aria-label on container", () => {
    render(<LocaleSwitcher locale="el" languageLabel="Language" />);
    const container = screen.getByLabelText("Language");
    expect(container).toBeDefined();
  });
});
