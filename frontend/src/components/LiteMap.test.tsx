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

  describe("external mode", () => {
    it("opens Google Maps in a new tab when externalHref is set", () => {
      const openSpy = vi.spyOn(window, "open").mockReturnValue(null);
      render(
        <LiteMap
          {...props}
          externalHref="https://www.google.com/maps/search/?api=1&query=Athens"
        />,
      );

      fireEvent.click(screen.getByRole("button", { name: "Show map" }));

      expect(openSpy).toHaveBeenCalledWith(
        "https://www.google.com/maps/search/?api=1&query=Athens",
        "_blank",
        "noopener,noreferrer",
      );
      // No iframe should appear in external mode
      expect(document.querySelector("iframe")).toBeNull();
    });

    it("renders the facade and hint text in external mode", () => {
      const { container } = render(
        <LiteMap
          {...props}
          externalHref="https://www.google.com/maps/search/?api=1&query=Athens"
        />,
      );
      expect(container.querySelector("iframe")).toBeNull();
      expect(screen.getByRole("button", { name: "Show map" })).toBeTruthy();
      expect(screen.getByText("201 Alexandras Ave")).toBeTruthy();
    });
  });
});
