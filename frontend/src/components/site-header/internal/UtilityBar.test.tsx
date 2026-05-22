import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import type { GlobalSettingsDTO } from "@/lib/cms/types";
import { UtilityBar } from "./UtilityBar";

const mockSettings: GlobalSettingsDTO = {
  locale: "el",
  address: "123 Main St, Athens",
  phoneTel: "+302110194618",
  phoneDisplay: "211-01 94 618",
  secondaryPhoneTel: "+306945773077",
  secondaryPhoneDisplay: "6945 77 30 77",
  email: "pavlos.tsolaridis@gmail.com",
  hours: "Mon-Fri 09:00-21:00",
  socialLinks: [],
};

describe("UtilityBar", () => {
  const baseProps = {
    address: "123 Main St, Athens",
    hours: "Mon-Fri 09:00-21:00",
    settings: mockSettings,
    locale: "el" as const,
    languageLabel: "Language",
  };

  it("renders address with status dot", () => {
    render(<UtilityBar {...baseProps} />);
    expect(screen.getByText(/123 Main St/)).toBeDefined();
    const dot = document.querySelector('[class*="status-dot"]');
    expect(dot).toBeTruthy();
    expect(dot?.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders primary and secondary phone links", () => {
    render(<UtilityBar {...baseProps} />);
    expect(screen.getByText("211-01 94 618").closest("a")?.getAttribute("href")).toBe(
      "tel:+302110194618",
    );
    expect(screen.getByText("6945 77 30 77").closest("a")?.getAttribute("href")).toBe(
      "tel:+306945773077",
    );
  });

  it("renders formatted hours on desktop in the start zone", () => {
    render(<UtilityBar {...baseProps} hours={"Mon-Fri 09:00-21:00\nSat 10:00-14:00"} />);
    const hoursEl = screen.getByText("Mon-Fri 09:00-21:00 · Sat 10:00-14:00");
    expect(hoursEl).toBeDefined();
    expect(hoursEl.closest('[class*="site-utility__zone--start"]')).toBeTruthy();
    expect(hoursEl.closest(".desktop-only")).toBeTruthy();
    expect(hoursEl.textContent).not.toContain("\n");
  });

  it("does not apply u-link to the phone wrapper", () => {
    render(<UtilityBar {...baseProps} />);
    const phoneWrapper = screen
      .getByText("211-01 94 618")
      .closest('[class*="site-utility__phones"]');
    expect(phoneWrapper).toBeTruthy();
    expect(phoneWrapper?.className).not.toContain("u-link");
  });

  it("applies u-link only to individual phone anchors", () => {
    render(<UtilityBar {...baseProps} />);
    const primaryLink = screen.getByText("211-01 94 618").closest("a");
    expect(primaryLink?.className).toContain("u-link");
  });

  it("renders locale switcher with correct locale label", () => {
    render(<UtilityBar {...baseProps} />);
    const switcher = screen.getByLabelText("Language");
    expect(switcher).toBeDefined();
  });

  it("renders address from settings override", () => {
    render(<UtilityBar {...baseProps} address="Custom Address" />);
    expect(screen.getByText(/Custom Address/)).toBeDefined();
  });

  it("renders address in start zone (hidden on mobile via CSS at ≤768px)", () => {
    render(<UtilityBar {...baseProps} />);
    const address = screen.getByText(/123 Main St/);
    expect(address.closest('[class*="site-utility__zone--start"]')).toBeTruthy();
  });

  it("renders phones and locale in end zone for mobile compact layout", () => {
    render(<UtilityBar {...baseProps} />);
    const endZone = document.querySelector('[class*="site-utility__zone--end"]');
    expect(endZone?.querySelector('[class*="site-utility__phones"]')).toBeTruthy();
    expect(screen.getByLabelText("Language")).toBeDefined();
  });
});
