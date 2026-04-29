import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { CTAButton } from "./CTAButton";

describe("CTAButton", () => {
  it("renders with full label as visible text", () => {
    render(<CTAButton href="/el/rantevou" fullLabel="Book Appointment" shortLabel="Book" />);
    expect(screen.getByText("Book Appointment")).toBeDefined();
  });

  it("renders short label with aria-hidden", () => {
    render(<CTAButton href="/el/rantevou" fullLabel="Book Appointment" shortLabel="Book" />);
    const short = screen.getByText("Book");
    expect(short.getAttribute("aria-hidden")).toBe("true");
  });

  it("link href is correct", () => {
    render(<CTAButton href="/el/rantevou" fullLabel="Book Appointment" shortLabel="Book" />);
    const link = screen.getByText("Book Appointment").closest("a");
    expect(link?.getAttribute("href")).toBe("/el/rantevou");
  });

  it("handles external appointment URLs", () => {
    render(<CTAButton href="https://example.com/booking" fullLabel="Book Now" shortLabel="Book" />);
    const link = screen.getByText("Book Now").closest("a");
    expect(link?.getAttribute("href")).toBe("https://example.com/booking");
    expect(link?.getAttribute("target")).toBe("_blank");
    expect(link?.getAttribute("rel")).toBe("noreferrer");
  });
});
