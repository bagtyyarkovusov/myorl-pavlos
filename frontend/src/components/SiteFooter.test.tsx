import { render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { SiteFooter } from "./SiteFooter";
import type {
  FooterCategory,
  GlobalSettingsDTO,
  NavigationNodeDTO,
  SocialLinkItemDTO,
} from "@/lib/cms/types";

function makeNode(overrides: {
  slug: string;
  title?: string;
  navLabel?: string;
  menuIndex?: number;
  footerCategory?: FooterCategory;
}): NavigationNodeDTO {
  return {
    documentId: `doc-${overrides.slug}`,
    locale: "el",
    slug: overrides.slug,
    title: overrides.title ?? overrides.slug,
    navLabel: overrides.navLabel ?? overrides.title ?? overrides.slug,
    menuTitle: null,
    menuIndex: overrides.menuIndex ?? 0,
    hideFromMenu: false,
    isFolder: false,
    parentPage: null,
    externalUrl: null,
    excerpt: null,
    featuredImage: null,
    imageCenter: null,
    footerCategory: overrides.footerCategory ?? "none",
    href: `/el/${overrides.slug}`,
    children: [],
  };
}

const SETTINGS: GlobalSettingsDTO = {
  locale: "el",
  address: "Λεωφ. Αλεξάνδρας 201, Αθήνα 11523",
  phoneTel: "+302106427000",
  phoneDisplay: "+30 210 6427 000",
  hours: null,
};

const NO_SOCIAL: SocialLinkItemDTO[] = [];

describe("SiteFooter (integration)", () => {
  it("renders Services / Patients / Company columns from CMS-driven footerCategory", () => {
    const navigation = [
      makeNode({ slug: "yperesies", title: "Υπηρεσίες", footerCategory: "services", menuIndex: 1 }),
      makeNode({ slug: "klinikes", title: "Κλινικές", footerCategory: "patients", menuIndex: 2 }),
      makeNode({ slug: "etairia", title: "Εταιρεία", footerCategory: "company", menuIndex: 3 }),
    ];

    render(
      <SiteFooter
        locale="el"
        navigation={navigation}
        settings={SETTINGS}
        appointmentHref="/el/rantevou"
        socialLinks={NO_SOCIAL}
      />,
    );

    expect(screen.getByRole("link", { name: "Υπηρεσίες" })).toHaveAttribute(
      "href",
      "/el/yperesies",
    );
    expect(screen.getByRole("link", { name: "Κλινικές" })).toHaveAttribute("href", "/el/klinikes");
    expect(screen.getByRole("link", { name: "Εταιρεία" })).toHaveAttribute("href", "/el/etairia");
  });

  it("sorts links inside each column by menuIndex ascending", () => {
    const navigation = [
      makeNode({ slug: "c", title: "C", footerCategory: "services", menuIndex: 30 }),
      makeNode({ slug: "a", title: "A", footerCategory: "services", menuIndex: 10 }),
      makeNode({ slug: "b", title: "B", footerCategory: "services", menuIndex: 20 }),
    ];

    render(
      <SiteFooter
        locale="el"
        navigation={navigation}
        settings={SETTINGS}
        appointmentHref="/el/rantevou"
        socialLinks={NO_SOCIAL}
      />,
    );

    const labels = screen.getAllByRole("link", { name: /^[ABC]$/ }).map((el) => el.textContent);
    expect(labels).toEqual(["A", "B", "C"]);
  });

  it("excludes pages with footerCategory='none' or unset", () => {
    const navigation = [
      makeNode({ slug: "hidden", title: "Hidden", footerCategory: "none" }),
      makeNode({ slug: "no-cat", title: "NoCategory" }),
      makeNode({
        slug: "shown",
        title: "Shown",
        footerCategory: "services",
        menuIndex: 1,
      }),
    ];

    render(
      <SiteFooter
        locale="el"
        navigation={navigation}
        settings={SETTINGS}
        appointmentHref="/el/rantevou"
        socialLinks={NO_SOCIAL}
      />,
    );

    expect(screen.queryByRole("link", { name: "Hidden" })).toBeNull();
    expect(screen.queryByRole("link", { name: "NoCategory" })).toBeNull();
    expect(screen.getByRole("link", { name: "Shown" })).toBeInTheDocument();
  });

  it("uses Greek column labels for locale='el'", () => {
    render(
      <SiteFooter
        locale="el"
        navigation={[]}
        settings={SETTINGS}
        appointmentHref="/el/rantevou"
        socialLinks={NO_SOCIAL}
      />,
    );

    expect(screen.getByText("Ιατρείο")).toBeInTheDocument();
    expect(screen.getByText("Ασθενείς")).toBeInTheDocument();
  });

  it("uses Russian column labels for locale='ru'", () => {
    render(
      <SiteFooter
        locale="ru"
        navigation={[]}
        settings={{ ...SETTINGS, locale: "ru" }}
        appointmentHref="/ru/rantevou"
        socialLinks={NO_SOCIAL}
      />,
    );

    expect(screen.getByText("Клиника")).toBeInTheDocument();
    expect(screen.getByText("Пациентам")).toBeInTheDocument();
  });

  it("injects the localized 'Book online' CTA at the top of the Patients column", () => {
    const navigation = [
      makeNode({
        slug: "klinikes",
        title: "Κλινικές",
        footerCategory: "patients",
        menuIndex: 5,
      }),
    ];

    render(
      <SiteFooter
        locale="el"
        navigation={navigation}
        settings={SETTINGS}
        appointmentHref="/el/rantevou"
        socialLinks={NO_SOCIAL}
      />,
    );

    const patientsLabel = screen.getByText("Ασθενείς");
    const patientsCol = patientsLabel.parentElement!;
    const links = within(patientsCol).getAllByRole("link");
    expect(links[0]!.textContent).toBe("Online ραντεβού");
    expect(links[0]!.getAttribute("href")).toBe("/el/rantevou");
    expect(links[1]!.textContent).toBe("Κλινικές");
  });

  it("renders address, phone (tel:), and email (mailto:) using settings + fallbacks", () => {
    render(
      <SiteFooter
        locale="el"
        navigation={[]}
        settings={SETTINGS}
        appointmentHref="/el/rantevou"
        socialLinks={NO_SOCIAL}
      />,
    );

    expect(screen.getByRole("link", { name: SETTINGS.phoneDisplay! })).toHaveAttribute(
      "href",
      `tel:${SETTINGS.phoneTel}`,
    );
    expect(screen.getByRole("link", { name: "info@myorl.gr" })).toHaveAttribute(
      "href",
      "mailto:info@myorl.gr",
    );
  });
});
