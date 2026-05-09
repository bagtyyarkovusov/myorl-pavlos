import type { SectionDTO } from "@/lib/cms/types";

export const INJECTED_MENU_ACCESS_GRID = "__injected.menu-access-grid" as const;
export const INJECTED_TESTIMONIALS_TEASER = "__injected.testimonials-teaser" as const;
export const INJECTED_VISIT_MAP = "__injected.visit-map" as const;

export type InjectedMarker =
  | { __injected: typeof INJECTED_MENU_ACCESS_GRID }
  | { __injected: typeof INJECTED_TESTIMONIALS_TEASER }
  | { __injected: typeof INJECTED_VISIT_MAP };

type CanonicalSlot =
  | { type: "section"; component: string }
  | { type: "injected"; marker: InjectedMarker; requires?: string };

const CANONICAL_ORDER: CanonicalSlot[] = [
  { type: "section", component: "sections.promo-slider" },
  {
    type: "injected",
    marker: { __injected: INJECTED_MENU_ACCESS_GRID },
    requires: "sections.promo-slider",
  },
  { type: "section", component: "sections.advantages" },
  { type: "section", component: "sections.linked-resources" },
  { type: "section", component: "sections.video" },
  {
    type: "injected",
    marker: { __injected: INJECTED_TESTIMONIALS_TEASER },
    requires: "sections.video",
  },
  { type: "section", component: "sections.contact" },
  { type: "injected", marker: { __injected: INJECTED_VISIT_MAP } },
];

const KNOWN_COMPONENTS = new Set(
  CANONICAL_ORDER.filter(
    (s): s is Extract<CanonicalSlot, { type: "section" }> => s.type === "section",
  ).map((s) => s.component),
);

export function sortHomeSections(sections: SectionDTO[]): (SectionDTO | InjectedMarker)[] {
  const byComponent = new Map<string, SectionDTO>();
  const unknowns: SectionDTO[] = [];

  for (const section of sections) {
    if (KNOWN_COMPONENTS.has(section.__component)) {
      byComponent.set(section.__component, section);
    } else {
      unknowns.push(section);
    }
  }

  const presentComponents = new Set(byComponent.keys());
  const result: (SectionDTO | InjectedMarker)[] = [];

  for (const slot of CANONICAL_ORDER) {
    if (slot.type === "section") {
      const section = byComponent.get(slot.component);
      if (section) result.push(section);
    } else {
      if (slot.requires && !presentComponents.has(slot.requires)) continue;
      result.push(slot.marker);
    }
  }

  result.push(...unknowns);

  return result;
}
