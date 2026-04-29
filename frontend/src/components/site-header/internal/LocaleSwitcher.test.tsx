import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { LocaleSwitcher } from "./LocaleSwitcher";

describe("LocaleSwitcher", () => {
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

  it("sets correct hrefLang and href attributes", () => {
    render(<LocaleSwitcher locale="el" languageLabel="Language" />);

    const grLink = screen.getByText("GR").closest("a");
    expect(grLink?.getAttribute("href")).toBe("/el");
    expect(grLink?.getAttribute("hreflang")).toBe("el");

    const ruLink = screen.getByText("RU").closest("a");
    expect(ruLink?.getAttribute("href")).toBe("/ru");
    expect(ruLink?.getAttribute("hreflang")).toBe("ru");
  });

  it("sets aria-label on container", () => {
    render(<LocaleSwitcher locale="el" languageLabel="Language" />);
    const container = screen.getByLabelText("Language");
    expect(container).toBeDefined();
  });
});
