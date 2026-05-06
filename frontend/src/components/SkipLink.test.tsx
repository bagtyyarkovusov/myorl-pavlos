import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SkipLink } from "./SkipLink";

describe("SkipLink", () => {
  it("renders a link to #main-content", () => {
    render(<SkipLink />);
    const link = screen.getByRole("link", { name: /skip to main content/i });
    expect(link).toHaveAttribute("href", "#main-content");
  });

  it("is visually hidden by default", () => {
    const { container } = render(<SkipLink />);
    const link = container.querySelector("a");
    expect(link?.className).toContain("sr-only");
  });

  it("becomes visible on focus", () => {
    const { container } = render(<SkipLink />);
    const link = container.querySelector("a");
    expect(link?.className).toContain("focus:not-sr-only");
  });
});
