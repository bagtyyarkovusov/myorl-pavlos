import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { LiteMap } from "./LiteMap";

describe("LiteMap", () => {
  const props = {
    src: "https://maps.google.com/maps?q=Athens&output=embed",
    title: "Clinic location",
    loadLabel: "Show map",
    hint: "201 Alexandras Ave",
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
});
