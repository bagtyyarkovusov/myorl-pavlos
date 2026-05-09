import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { UnknownSection } from "./UnknownSection";

describe("UnknownSection", () => {
  it("renders the 'Content updating' status text", () => {
    render(<UnknownSection section={{ __component: "sections.mystery" }} />);
    expect(screen.getByText("Content updating")).toBeTruthy();
  });

  it("does not duplicate the section heading (the outer PageSection owns it)", () => {
    render(<UnknownSection section={{ __component: "sections.unknown", heading: "My Heading" }} />);
    // The placeholder is content-only — it must NOT re-render the heading.
    expect(screen.queryByText("My Heading")).toBeNull();
  });

  it("does not use inline style props", () => {
    const { container } = render(<UnknownSection section={{ __component: "sections.mystery" }} />);
    const div = container.querySelector("[data-section='unknown']")!;
    expect(div.getAttribute("style")).toBeNull();
  });

  it("renders dev badge with component name in development", () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    const { container } = render(<UnknownSection section={{ __component: "sections.mystery" }} />);
    const badge = container.querySelector("[data-section='unknown'] span");
    expect(badge?.textContent).toBe("sections.mystery");
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });
});
