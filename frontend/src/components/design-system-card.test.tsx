import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { Card } from "./design-system";

describe("Card", () => {
  it("renders the title as the accessible link instead of wrapping the whole card", () => {
    render(
      <Card
        title="Laser dentistry"
        description="<p>Precise care</p>"
        href="/el/laser"
        ctaLabel="Open"
      />,
    );

    const link = screen.getByRole("link", { name: "Laser dentistry" });
    expect(link.getAttribute("href")).toBe("/el/laser");
    expect(link.closest("article")).toBeTruthy();
  });

  it("adapts visible treatment by density", () => {
    const { container } = render(
      <Card title="Dense resource" href="/el/resource" density="scanning" ctaLabel="Open" />,
    );

    const article = container.querySelector("article");
    expect(article?.getAttribute("data-density")).toBe("scanning");
    expect(screen.queryByText("Open")).toBeNull();
  });
});
