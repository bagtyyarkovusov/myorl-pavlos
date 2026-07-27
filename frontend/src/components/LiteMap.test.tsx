import { describe, expect, it, vi, afterEach } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { LiteMap } from "./LiteMap";

afterEach(() => {
  vi.restoreAllMocks();
});

describe("LiteMap", () => {
  const props = {
    src: "https://maps.google.com/maps?q=Athens&output=embed",
    title: "Clinic location",
    loadLabel: "Show map",
    hint: "201 Alexandras Ave",
    externalHref: "https://www.google.com/maps/search/?api=1&query=37.983315%2C23.738826",
    externalLabel: "Open in Google Maps",
  };

  it("renders a click-to-load facade with no Google iframe on first paint", () => {
    const { container } = render(<LiteMap {...props} />);
    expect(container.querySelector("iframe")).toBeNull();
    expect(screen.getByRole("button", { name: "Show map" })).toBeTruthy();
    expect(screen.getByText("201 Alexandras Ave")).toBeTruthy();
  });

  it("loads the Google Maps iframe only after the visitor activates it", () => {
    const { container } = render(<LiteMap {...props} />);
    fireEvent.click(screen.getByRole("button", { name: "Show map" }));
    const iframe = container.querySelector("iframe");
    expect(iframe?.getAttribute("src")).toBe(props.src);
    expect(iframe?.getAttribute("title")).toBe("Clinic location");
  });

  it("shows a secondary external Google Maps link after activation", () => {
    const { container } = render(<LiteMap {...props} />);

    fireEvent.click(screen.getByRole("button", { name: "Show map" }));

    expect(container.querySelector("iframe")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute(
      "href",
      props.externalHref,
    );
    expect(screen.getByRole("link", { name: "Open in Google Maps" })).toHaveAttribute(
      "target",
      "_blank",
    );
  });
});
