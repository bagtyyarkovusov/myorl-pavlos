import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import type { GlobalSettingsDTO, NavigationNodeDTO } from "@/lib/cms/types";
import { MobileDrawer } from "./MobileDrawer";

const items: NavigationNodeDTO[] = [
  {
    documentId: "item-1",
    locale: "el" as const,
    slug: "about",
    title: "About",
    navLabel: "About",
    menuTitle: null,
    excerpt: null,
    href: "/el/about",
    menuIndex: 0,
    hideFromMenu: false,
    isFolder: false,
    layoutVariant: "standard",
    parentPage: null,
    externalUrl: null,
    tags: [],
    children: [],
  },
];

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

const baseProps = {
  isOpen: false,
  onClose: vi.fn(),
  closeButtonRef: { current: null },
  items,
  locale: "el" as const,
  appointmentHref: "/el/rantevou",
  address: "123 Main St, Athens",
  settings: mockSettings,
  closeMenuLabel: "Close menu",
  brandLogoAlt: "MyORL Logo",
  mobileNavLabel: "Mobile navigation",
  mobileNavInnerLabel: "Mobile nav inner",
  overviewMobile: "Section overview",
  topicsLabel: (count: number) => `${count} topics`,
  bookAppointmentLabel: "Book Appointment",
};

describe("MobileDrawer", () => {
  it("renders nothing when closed", () => {
    render(<MobileDrawer {...baseProps} isOpen={false} />);

    const drawer = document.querySelector('[class*="mobile-drawer"]') as HTMLElement;
    expect(drawer.getAttribute("aria-hidden")).toBe("true");
  });

  it("renders drawer when open", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);

    const drawer = document.querySelector('[class*="mobile-drawer"]') as HTMLElement;
    expect(drawer.getAttribute("aria-hidden")).toBe("false");
    expect(drawer.className).toContain("is-open");
  });

  it("renders brand logo with correct alt", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);
    const img = screen.getByAltText("MyORL Logo");
    expect(img).toBeDefined();
    expect(img.getAttribute("data-nimg")).toBe("1");
  });

  it("renders close button in drawer head", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);
    const closeBtns = screen.getAllByLabelText("Close menu");
    const closeBtn = closeBtns.find(
      (btn) => btn.closest('[class*="mobile-drawer__head"]') !== null,
    );
    expect(closeBtn).toBeDefined();
  });

  it("calls onClose when backdrop is clicked", () => {
    const onClose = vi.fn();
    render(<MobileDrawer {...baseProps} isOpen={true} onClose={onClose} />);

    const backdrop = document.querySelector('[class*="mobile-drawer__backdrop"]') as HTMLElement;
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(<MobileDrawer {...baseProps} isOpen={true} onClose={onClose} />);

    const closeBtns = screen.getAllByLabelText("Close menu");
    const closeBtn = closeBtns.find(
      (btn) => btn.closest('[class*="mobile-drawer__head"]') !== null,
    )!;
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("renders mobile menu inside drawer body", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);

    const body = document.querySelector('[class*="mobile-drawer__body"]') as HTMLElement;
    expect(body).toBeTruthy();
    expect(screen.getByText("About")).toBeDefined();
  });

  it("renders CTA button in drawer foot", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} appointmentHref="/el/rantevou" />);

    const foot = document.querySelector('[class*="mobile-drawer__foot"]') as HTMLElement;
    expect(foot).toBeTruthy();
    expect(screen.getByText("Book Appointment").closest("a")?.getAttribute("href")).toBe(
      "/el/rantevou",
    );
  });

  it("sets data-locale attribute", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} locale="el" />);

    const drawer = document.querySelector('[data-locale="el"]');
    expect(drawer).toBeTruthy();
  });

  it("renders mobile nav with correct aria-label", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);
    expect(screen.getByLabelText("Mobile navigation")).toBeDefined();
  });

  it("renders address in info section", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);
    expect(screen.getByText(/123 Main St/)).toBeDefined();
  });

  it("renders phone links in info section", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);
    expect(screen.getByText("211-01 94 618").closest("a")?.getAttribute("href")).toBe(
      "tel:+302110194618",
    );
    expect(screen.getByText("6945 77 30 77").closest("a")?.getAttribute("href")).toBe(
      "tel:+306945773077",
    );
  });

  it("styles the phone separator between clinic and mobile lines", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} locale="ru" />);
    const separator = screen.getByText("или");
    expect(separator.className).toContain("mobile-drawer__phone-separator");
    expect(separator.getAttribute("aria-hidden")).toBe("true");
  });

  it("does not render hours in info section", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);
    expect(screen.queryByText("Mon-Fri 09:00-21:00")).toBeNull();
  });

  it("does not render locale switcher in drawer (locale lives in header utility bar)", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);
    expect(screen.queryByLabelText("Language")).toBeNull();
  });

  it("traps focus: Tab from last focusable element cycles to first", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);

    const panel = document.getElementById("mobile-navigation") as HTMLElement;
    const tabbables = panel.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])',
    );
    const last = tabbables[tabbables.length - 1]!;
    last.focus();

    fireEvent.keyDown(panel, { key: "Tab" });

    expect(document.activeElement).toBe(tabbables[0]);
  });
});
