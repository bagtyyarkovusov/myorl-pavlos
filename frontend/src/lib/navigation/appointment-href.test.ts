import { describe, expect, it } from "vitest";

import type { NavigationInput } from "@/lib/cms/types";
import {
  defaultAppointmentHref,
  findAppointmentHref,
  resolveAppointmentHref,
} from "@/lib/navigation/appointment-href";

function makePage(
  overrides: Partial<NavigationInput> & Pick<NavigationInput, "slug">,
): NavigationInput {
  return {
    documentId: `doc-${overrides.slug}`,
    locale: "el",
    title: overrides.slug,
    navLabel: overrides.slug,
    menuIndex: 0,
    hideFromMenu: false,
    isFolder: false,
    layoutVariant: "standard",
    tags: [],
    ...overrides,
  };
}

describe("resolveAppointmentHref", () => {
  it("resolves hidden appointment-form pages by layout variant", () => {
    const pages = [
      makePage({
        slug: "rantevou",
        layoutVariant: "appointment-form",
        hideFromMenu: true,
        title: "Κλείστε ραντεβού",
      }),
    ];

    expect(resolveAppointmentHref(pages, "el")).toBe("/el/rantevou");
  });

  it("falls back to locale slug when no pages match", () => {
    expect(resolveAppointmentHref([], "el")).toBe("/el/rantevou");
    expect(resolveAppointmentHref([], "ru")).toBe("/ru/zapis");
  });

  it("matches Russian zapis slug", () => {
    const pages = [
      makePage({
        locale: "ru",
        slug: "zapis",
        layoutVariant: "appointment-form",
        hideFromMenu: true,
        title: "Запись на приём",
      }),
    ];

    expect(resolveAppointmentHref(pages, "ru")).toBe("/ru/zapis");
  });
});

describe("findAppointmentHref", () => {
  it("finds appointment link in visible navigation tree", () => {
    const href = findAppointmentHref(
      [
        {
          ...makePage({ slug: "rantevou", title: "Online ραντεβού" }),
          href: "/el/rantevou",
          children: [],
        },
      ],
      "el",
    );

    expect(href).toBe("/el/rantevou");
  });
});

describe("defaultAppointmentHref", () => {
  it("returns canonical locale paths", () => {
    expect(defaultAppointmentHref("el")).toBe("/el/rantevou");
    expect(defaultAppointmentHref("ru")).toBe("/ru/zapis");
  });
});
