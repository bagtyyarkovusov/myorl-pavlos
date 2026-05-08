import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { UnknownSection } from "./UnknownSection";

describe("UnknownSection", () => {
  it("renders heading or component name", () => {
    render(
      <UnknownSection
        section={{ __component: "sections.unknown", heading: "My Heading" }}
        sectionIndex={0}
      />,
    );
    expect(screen.getByText("My Heading")).toBeTruthy();
  });

  it("falls back to component name when heading is absent", () => {
    render(<UnknownSection section={{ __component: "sections.mystery" }} sectionIndex={0} />);
    expect(screen.getByText("sections.mystery")).toBeTruthy();
  });

  it("shows 'Content updating' hint", () => {
    render(<UnknownSection section={{ __component: "sections.mystery" }} sectionIndex={0} />);
    expect(screen.getByText("Content updating")).toBeTruthy();
  });

  it("does not use inline style props", () => {
    const { container } = render(
      <UnknownSection section={{ __component: "sections.mystery" }} sectionIndex={0} />,
    );
    const div = container.querySelector("[data-section='unknown']")!;
    expect(div.getAttribute("style")).toBeNull();
  });

  it("renders dev badge with component name in development", () => {
    const originalEnv = process.env.NODE_ENV;
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    const { container } = render(
      <UnknownSection section={{ __component: "sections.mystery" }} sectionIndex={0} />,
    );
    const badge = container.querySelector("[data-section='unknown'] span");
    expect(badge?.textContent).toBe("sections.mystery");
    (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
  });
});
