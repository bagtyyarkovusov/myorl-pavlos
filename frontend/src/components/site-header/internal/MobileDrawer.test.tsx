import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";

import { MobileDrawer } from "./MobileDrawer";

const items = [
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
    parentPage: null,
    externalUrl: null,
    children: [],
  },
];

const baseProps = {
  isOpen: false,
  onClose: vi.fn(),
  closeButtonRef: { current: null },
  items,
  locale: "el" as const,
  appointmentHref: "/el/rantevou",
  address: "123 Main St, Athens",
  hours: "Mon-Fri 09:00-21:00",
  phoneTel: "+302106427000",
  phoneDisplay: "+30 210 6427 000",
  closeMenuLabel: "Close menu",
  brandLogoAlt: "MyORL Logo",
  mobileNavLabel: "Mobile navigation",
  mobileNavInnerLabel: "Mobile nav inner",
  overviewMobile: "Overview",
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
    expect(img.getAttribute("src")).toBe("/logo-myorl.png");
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

  it("renders phone link in info section", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);
    const link = screen.getByText("+30 210 6427 000");
    expect(link.closest("a")?.getAttribute("href")).toBe("tel:+302106427000");
  });

  it("renders hours in info section", () => {
    render(<MobileDrawer {...baseProps} isOpen={true} />);
    expect(screen.getByText("Mon-Fri 09:00-21:00")).toBeDefined();
  });
});
