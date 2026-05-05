import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { SectionGrid } from "./SectionGrid";

describe("SectionGrid", () => {
  it("renders children inside a grid container", () => {
    const { container } = render(
      <SectionGrid columns={3}>
        <div>Item 1</div>
        <div>Item 2</div>
      </SectionGrid>,
    );
    const grid = container.firstElementChild;
    expect(grid).toBeTruthy();
    expect(grid!.textContent).toContain("Item 1");
    expect(grid!.textContent).toContain("Item 2");
  });

  it("applies column-specific CSS class", () => {
    const { container } = render(
      <SectionGrid columns={2}>
        <div>A</div>
      </SectionGrid>,
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("cols-2");
  });

  it("defaults to 1 column when no prop is provided", () => {
    const { container } = render(
      <SectionGrid>
        <div>A</div>
      </SectionGrid>,
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("cols-1");
  });

  it("accepts a custom className", () => {
    const { container } = render(
      <SectionGrid columns={3} className="custom-class">
        <div>A</div>
      </SectionGrid>,
    );
    const grid = container.firstElementChild as HTMLElement;
    expect(grid.className).toContain("custom-class");
  });
});
