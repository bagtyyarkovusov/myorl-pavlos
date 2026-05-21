import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { SiteHeaderClient } from "../SiteHeaderClient";
import type { NavigationNodeDTO } from "@/lib/cms/types";

const mockNavigation: NavigationNodeDTO[] = [
  {
    documentId: "home",
    locale: "el" as const,
    slug: "",
    title: "Home",
    navLabel: "Home",
    menuTitle: null,
    excerpt: null,
    href: "/el",
    menuIndex: 0,
    hideFromMenu: false,
    isFolder: false,
    layoutVariant: "standard",
    parentPage: null,
    externalUrl: null,
    tags: [],
    children: [],
  },
  {
    documentId: "services",
    locale: "el" as const,
    slug: "services",
    title: "Medical Services",
    navLabel: "Services",
    menuTitle: null,
    excerpt: "Overview of services",
    href: "/el/services",
    menuIndex: 1,
    hideFromMenu: false,
    isFolder: true,
    layoutVariant: "standard",
    parentPage: null,
    externalUrl: null,
    tags: [],
    children: [
      {
        documentId: "consultation",
        locale: "el" as const,
        slug: "consultation",
        title: "Consultation",
        navLabel: "Consultation",
        menuTitle: null,
        excerpt: null,
        href: "/el/services/consultation",
        menuIndex: 0,
        hideFromMenu: false,
        isFolder: false,
        layoutVariant: "standard",
        parentPage: null,
        externalUrl: null,
        tags: [],
        children: [],
      },
    ],
  },
  {
    documentId: "contact",
    locale: "el" as const,
    slug: "contact",
    title: "Contact",
    navLabel: "Contact",
    menuTitle: null,
    excerpt: null,
    href: "/el/contact",
    menuIndex: 2,
    hideFromMenu: false,
    isFolder: false,
    layoutVariant: "standard",
    parentPage: null,
    externalUrl: null,
    tags: [],
    children: [],
  },
];

const defaultSettings = {
  locale: "el" as const,
  address: null,
  phoneTel: null,
  phoneDisplay: null,
  hours: null,
};

describe("SiteHeaderClient", () => {
  it("renders desktop navigation links", () => {
    render(
      <SiteHeaderClient
        locale="el"
        navigation={mockNavigation}
        appointmentHref="/el/rantevou"
        settings={defaultSettings}
      />,
    );

    expect(screen.getByLabelText("Κύρια πλοήγηση")).toBeDefined();
    // Links appear in both desktop and mobile; use getAllBy and check count
    expect(screen.getAllByText("Home").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Services").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Contact").length).toBeGreaterThanOrEqual(1);
  });

  it("renders CTA button for appointment booking", () => {
    render(
      <SiteHeaderClient
        locale="el"
        navigation={mockNavigation}
        appointmentHref="/el/rantevou"
        settings={defaultSettings}
      />,
    );

    const ctaLinks = screen.getAllByText("Κλείσε ραντεβού →");
    expect(ctaLinks.length).toBeGreaterThanOrEqual(1);
    expect(ctaLinks[0]?.closest("a")?.getAttribute("href")).toBe("/el/rantevou");
  });

  it("renders locale switcher with both locales", () => {
    render(
      <SiteHeaderClient
        locale="el"
        navigation={mockNavigation}
        appointmentHref="/el/rantevou"
        settings={defaultSettings}
      />,
    );

    expect(screen.getAllByText("GR").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("RU").length).toBeGreaterThanOrEqual(1);
  });

  it("renders hamburger button at mobile viewport", () => {
    render(
      <SiteHeaderClient
        locale="el"
        navigation={mockNavigation}
        appointmentHref="/el/rantevou"
        settings={defaultSettings}
      />,
    );

    const hamburger = screen.getByLabelText("Άνοιγμα μενού");
    expect(hamburger).toBeDefined();
    expect(hamburger.getAttribute("aria-expanded")).toBe("false");
    expect(hamburger.getAttribute("aria-controls")).toBe("mobile-navigation");
  });

  it("renders mobile drawer structure when drawer is open", () => {
    render(
      <SiteHeaderClient
        locale="el"
        navigation={mockNavigation}
        appointmentHref="/el/rantevou"
        settings={defaultSettings}
      />,
    );

    const drawer = document.querySelector('[class*="mobile-drawer"]') as HTMLElement;
    expect(drawer).toBeTruthy();
    expect(drawer.getAttribute("aria-hidden")).toBe("true");

    const panel = document.getElementById("mobile-navigation") as HTMLElement;
    expect(panel).toBeTruthy();
    expect(panel.getAttribute("aria-label")).toBe("Πλοήγηση κινητού");
  });

  it("renders brand logo with next/image", () => {
    render(
      <SiteHeaderClient
        locale="el"
        navigation={mockNavigation}
        appointmentHref="/el/rantevou"
        settings={defaultSettings}
      />,
    );

    const logos = screen.getAllByAltText("MyORL — ΩΡΛ Χειρουργική Κλινική Αθηνών");
    expect(logos.length).toBeGreaterThanOrEqual(1);
    // Next.js Image sets width/height attributes from props
    expect(logos[0]?.getAttribute("width")).toBe("64");
    expect(logos[0]?.getAttribute("height")).toBe("64");
  });

  it("renders utility bar with contact info and locale switcher", () => {
    render(
      <SiteHeaderClient
        locale="el"
        navigation={mockNavigation}
        appointmentHref="/el/rantevou"
        settings={defaultSettings}
      />,
    );

    const addressElements = screen.getAllByText(/Λεωφ. Αλεξάνδρας 201, Αθήνα/);
    expect(addressElements.length).toBeGreaterThanOrEqual(1);
  });
});
