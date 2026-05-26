import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { GlobalSettingsDTO } from "@/lib/cms/types";
import { MobileActionDock } from "./MobileActionDock";

const mockSettings: GlobalSettingsDTO = {
  locale: "el",
  address: "123 Main St, Athens",
  phoneTel: "+302110194618",
  phoneDisplay: "211-01 94 618",
  secondaryPhoneTel: "+306945773077",
  secondaryPhoneDisplay: "6945 77 30 77",
  email: "pavlos.tsolaridis@gmail.com",
  hours: "Mon-Fri 09:00-21:00",
  disclaimerText: null,
  socialLinks: [],
};

describe("MobileActionDock", () => {
  it("renders round sticky call and message actions", () => {
    render(<MobileActionDock locale="el" settings={mockSettings} contactHref="/el/epikoinonia" />);

    expect(screen.getByLabelText(/Κλήση στο κινητό/)).toBeDefined();
    expect(screen.getByRole("link", { name: /Αποστολή μηνύματος/ })).toBeDefined();
    expect(document.querySelector('[class*="fab-group"]')?.children.length).toBe(2);
    expect(document.querySelector('[class*="fab--scroll"]')).toBeTruthy();
  });

  it("scroll action is hidden until user scrolls past threshold", () => {
    render(<MobileActionDock locale="el" settings={mockSettings} contactHref="/el/epikoinonia" />);

    const scrollBtn = screen.getByLabelText(/Μετάβαση στην αρχή/);
    expect(scrollBtn.getAttribute("aria-hidden")).toBe("true");
    expect(scrollBtn.getAttribute("tabindex")).toBe("-1");

    Object.defineProperty(window, "scrollY", { value: 500, writable: true, configurable: true });
    fireEvent.scroll(window);

    expect(scrollBtn.getAttribute("aria-hidden")).toBe("false");
    expect(scrollBtn.getAttribute("tabindex")).toBe("0");
  });

  it("returns null when no call tel and no contact href", () => {
    const { container } = render(
      <MobileActionDock
        locale="el"
        settings={{
          ...mockSettings,
          phoneTel: null,
          phoneDisplay: null,
          secondaryPhoneTel: null,
          secondaryPhoneDisplay: null,
        }}
        contactHref=""
      />,
    );
    expect(container.firstChild).toBeNull();
  });
});
