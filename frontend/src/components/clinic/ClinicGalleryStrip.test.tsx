import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";

import { ClinicGalleryStrip } from "./ClinicGalleryStrip";
import type { GalleryItemDTO } from "@/lib/cms/types";

const ITEMS: GalleryItemDTO[] = Array.from({ length: 6 }, (_, index) => ({
  caption: null,
  image: {
    url: `/uploads/clinic-${index + 1}.jpg`,
    alternativeText: `Clinic ${index + 1}`,
    width: 800,
    height: 600,
  },
}));

beforeEach(() => {
  vi.stubEnv("STRAPI_URL", "http://localhost:1337");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://myorl.example.com");

  class MockResizeObserver {
    observe = vi.fn();
    disconnect = vi.fn();
  }
  vi.stubGlobal("ResizeObserver", MockResizeObserver);
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("ClinicGalleryStrip", () => {
  it("renders strip navigation when the row overflows", async () => {
    const scrollTo = vi.fn();
    vi.spyOn(HTMLElement.prototype, "offsetLeft", "get").mockReturnValue(220);
    vi.spyOn(HTMLElement.prototype, "offsetWidth", "get").mockReturnValue(220);

    const { container } = render(<ClinicGalleryStrip items={ITEMS} locale="el" />);
    const strip = container.querySelector('[class*="stripViewport"]') as HTMLDivElement;

    Object.defineProperty(strip, "scrollLeft", { value: 0, writable: true, configurable: true });
    Object.defineProperty(strip, "clientWidth", { value: 400, configurable: true });
    Object.defineProperty(strip, "scrollWidth", { value: 1200, configurable: true });
    strip.scrollTo = scrollTo;
    fireEvent.scroll(strip);

    expect(screen.getByRole("button", { name: "Επόμενες φωτογραφίες" })).toBeDefined();
    expect(screen.getByRole("button", { name: "Προηγούμενες φωτογραφίες" })).toBeDisabled();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Επόμενες φωτογραφίες" })).not.toBeDisabled();
    });

    fireEvent.click(screen.getByRole("button", { name: "Επόμενες φωτογραφίες" }));
    expect(scrollTo).toHaveBeenCalledWith({ left: 220, behavior: "smooth" });
  });
});
