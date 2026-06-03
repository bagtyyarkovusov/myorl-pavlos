import type { SectionDTO } from "@/lib/cms/types";

type AdvantagesSection = Extract<SectionDTO, { __component: "sections.advantages" }>;
type TestimonialsSection = Extract<
  SectionDTO,
  { __component: "sections.home-testimonials-teaser" }
>;
type OrderedHomeSectionComponent = Extract<
  SectionDTO["__component"],
  | "sections.promo-slider"
  | "sections.advantages"
  | "sections.linked-resources"
  | "sections.home-resource-group"
  | "sections.home-testimonials-teaser"
  | "sections.home-notice"
  | "sections.video"
>;

type IndexedSection = {
  section: SectionDTO;
  sourceIndex: number;
};

export type HomeRenderItem =
  | {
      kind: "section";
      section: SectionDTO;
      sourceIndex: number;
    }
  | {
      kind: "home-advantages";
      section: AdvantagesSection;
      sourceIndex: number;
    }
  | {
      kind: "menu-access-grid";
    }
  | {
      kind: "home-testimonials";
      section: TestimonialsSection;
      sourceIndex: number;
    }
  | {
      kind: "home-visit-map";
    };

const HOME_SECTION_ORDER: OrderedHomeSectionComponent[] = [
  "sections.promo-slider",
  "sections.advantages",
  "sections.home-resource-group",
  "sections.linked-resources",
  "sections.home-testimonials-teaser",
  "sections.home-notice",
  "sections.video",
];

const ORDERED_HOME_SECTION_SET = new Set<string>(HOME_SECTION_ORDER);

export function orderHomeRenderItems(sections: readonly SectionDTO[]): HomeRenderItem[] {
  const groups = new Map<OrderedHomeSectionComponent, IndexedSection[]>(
    HOME_SECTION_ORDER.map((component) => [component, []]),
  );
  const unlistedSections: IndexedSection[] = [];

  sections.forEach((section, sourceIndex) => {
    if (ORDERED_HOME_SECTION_SET.has(section.__component)) {
      groups
        .get(section.__component as OrderedHomeSectionComponent)
        ?.push({ section, sourceIndex });
      return;
    }

    unlistedSections.push({ section, sourceIndex });
  });

  const items: HomeRenderItem[] = [];
  const promoSections = groups.get("sections.promo-slider") ?? [];
  const linkedSections = groups.get("sections.linked-resources") ?? [];

  appendSections(items, promoSections);
  if (promoSections.length > 0) {
    items.push({ kind: "menu-access-grid" });
  }

  for (const item of groups.get("sections.advantages") ?? []) {
    items.push({
      kind: "home-advantages",
      section: item.section as AdvantagesSection,
      sourceIndex: item.sourceIndex,
    });
  }

  appendSections(items, groups.get("sections.home-resource-group") ?? []);
  appendSections(items, linkedSections);

  for (const item of groups.get("sections.home-testimonials-teaser") ?? []) {
    items.push({
      kind: "home-testimonials",
      section: item.section as TestimonialsSection,
      sourceIndex: item.sourceIndex,
    });
  }

  appendSections(items, groups.get("sections.home-notice") ?? []);
  appendSections(items, groups.get("sections.video") ?? []);
  appendSections(items, unlistedSections);
  items.push({ kind: "home-visit-map" });

  return items;
}

export function getHomeRenderItemKey(item: HomeRenderItem): string {
  switch (item.kind) {
    case "section":
      return `${item.section.__component}-${item.sourceIndex}`;
    case "home-advantages":
      return `${item.kind}-${item.sourceIndex}`;
    case "home-testimonials":
      return `${item.kind}-${item.sourceIndex}`;
    default:
      return item.kind;
  }
}

function appendSections(items: HomeRenderItem[], sections: IndexedSection[]) {
  for (const { section, sourceIndex } of sections) {
    items.push({ kind: "section", section, sourceIndex });
  }
}
