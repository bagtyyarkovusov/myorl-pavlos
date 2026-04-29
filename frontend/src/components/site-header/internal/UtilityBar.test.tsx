import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { UtilityBar } from "./UtilityBar";

describe("UtilityBar", () => {
  const baseProps = {
    address: "123 Main St, Athens",
    hours: "Mon-Fri 09:00-21:00",
    phoneTel: "+302106427000",
    phoneDisplay: "+30 210 6427 000",
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

  it("renders phone link with tel: href", () => {
    render(<UtilityBar {...baseProps} />);
    const link = screen.getByText("+30 210 6427 000");
    expect(link.closest("a")?.getAttribute("href")).toBe("tel:+302106427000");
  });

  it("renders hours on desktop", () => {
    render(<UtilityBar {...baseProps} />);
    const hoursEl = screen.getByText("Mon-Fri 09:00-21:00");
    expect(hoursEl).toBeDefined();
    expect(hoursEl.getAttribute("class")).toContain("desktop-only");
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
});
