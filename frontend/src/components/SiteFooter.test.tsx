import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./SiteFooter";
import { buildNavigationTree } from "@/lib/cms/navigation";
import type { GlobalSettingsDTO, NavigationInput } from "@/lib/cms/types";

const SETTINGS: GlobalSettingsDTO = {
  locale: "el",
  address: "123 Main St, Athens",
  phoneTel: "+302101234567",
  phoneDisplay: "+30 210 123 4567",
  hours: "Mon-Fri 9:00-17:00",
};

function makePage(overrides: Partial<NavigationInput>): NavigationInput {
  return {
    documentId: overrides.documentId ?? `doc-${overrides.slug ?? "page"}`,
    locale: "el",
    slug: overrides.slug ?? "page",
    title: overrides.title ?? "Page",
    menuTitle: overrides.menuTitle ?? null,
    navLabel: overrides.navLabel ?? overrides.title ?? "Page",
    menuIndex: overrides.menuIndex ?? 0,
    hideFromMenu: overrides.hideFromMenu ?? false,
    parentPage: overrides.parentPage ?? null,
    externalUrl: overrides.externalUrl ?? null,
    isFolder: overrides.isFolder ?? false,
    layoutVariant: overrides.layoutVariant ?? "standard",
    excerpt: overrides.excerpt ?? null,
    featuredImage: overrides.featuredImage ?? null,
    imageCenter: overrides.imageCenter ?? null,
    footerCategory: overrides.footerCategory ?? "none",
  };
}

describe("SiteFooter", () => {
  it("renders CMS footer categories from semantic site navigation", () => {
    const navigation = buildNavigationTree(
      [
        makePage({
          documentId: "services",
          slug: "yperesies",
          title: "Services",
          navLabel: "Services",
          menuIndex: 2,
          footerCategory: "services",
        }),
        makePage({
          documentId: "patients",
          slug: "patients",
          title: "Patient Info",
          navLabel: "Patient Info",
          menuIndex: 1,
          footerCategory: "patients",
        }),
        makePage({
          documentId: "company",
          slug: "about",
          title: "About",
          navLabel: "About",
          menuIndex: 3,
          footerCategory: "company",
        }),
        makePage({
          documentId: "hidden-footer",
          slug: "hidden-footer",
          title: "Hidden Footer",
          navLabel: "Hidden Footer",
          menuIndex: 4,
          footerCategory: "none",
        }),
      ],
      "el",
    );

    render(
      <SiteFooter
        locale="el"
        navigation={navigation}
        settings={SETTINGS}
        appointmentHref="/el/appointment"
        socialLinks={[]}
      />,
    );

    expect(screen.getByRole("link", { name: "Services" })).toHaveAttribute("href", "/el/yperesies");
    expect(screen.getByRole("link", { name: "Patient Info" })).toHaveAttribute(
      "href",
      "/el/patients",
    );
    expect(screen.getByRole("link", { name: "About" })).toHaveAttribute("href", "/el/about");
    expect(screen.queryByRole("link", { name: "Hidden Footer" })).toBeNull();
    expect(screen.getByRole("link", { name: "Online ραντεβού" })).toHaveAttribute(
      "href",
      "/el/appointment",
    );
  });

  it("keeps static contact and appointment fallbacks when CMS footer groups are empty", () => {
    render(
      <SiteFooter
        locale="el"
        navigation={[]}
        settings={SETTINGS}
        appointmentHref="/el/appointment"
        socialLinks={[]}
      />,
    );

    expect(screen.getByText("123 Main St, Athens")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "+30 210 123 4567" })).toHaveAttribute(
      "href",
      "tel:+302101234567",
    );
    expect(screen.getByRole("link", { name: "Online ραντεβού" })).toHaveAttribute(
      "href",
      "/el/appointment",
    );
  });
});
