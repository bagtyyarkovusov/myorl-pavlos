import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { MotionSection } from "./MotionSection";

describe("MotionSection", () => {
  it("renders children inside a section element", () => {
    render(
      <MotionSection label="Test">
        <p>child content</p>
      </MotionSection>,
    );
    expect(screen.getByText("child content")).toBeInTheDocument();
  });

  it("applies data-background and data-density passthrough", () => {
    const { container } = render(
      <MotionSection background="bone" density="theater" label="Test">
        <p>x</p>
      </MotionSection>,
    );
    const section = container.querySelector("section")!;
    expect(section.getAttribute("data-background")).toBe("bone");
    expect(section.getAttribute("data-density")).toBe("theater");
  });

  it("always uses data-motion=instant (no scroll fade-up)", () => {
    const { container } = render(
      <MotionSection label="Test">
        <p>x</p>
      </MotionSection>,
    );
    const section = container.querySelector("section")!;
    expect(section.getAttribute("data-motion")).toBe("instant");
  });

  it("forwards id and aria-labelledby", () => {
    const { container } = render(
      <MotionSection id="hero" ariaLabelledBy="hero-title">
        <h2 id="hero-title">Hero</h2>
      </MotionSection>,
    );
    const section = container.querySelector("section")!;
    expect(section.getAttribute("id")).toBe("hero");
    expect(section.getAttribute("aria-labelledby")).toBe("hero-title");
  });
});
