import type { SectionDTO } from "@/lib/cms/types";

export type HomeSectionMap = {
  advantagesSection:
    | (Extract<SectionDTO, { __component: "sections.advantages" }> & {
        __component: "sections.advantages";
      })
    | undefined;
  promoSection:
    | (Extract<SectionDTO, { __component: "sections.promo-slider" }> & {
        __component: "sections.promo-slider";
      })
    | undefined;
  linkedResourcesSection:
    | (Extract<SectionDTO, { __component: "sections.linked-resources" }> & {
        __component: "sections.linked-resources";
      })
    | undefined;
  videoSection:
    | (Extract<SectionDTO, { __component: "sections.video" }> & { __component: "sections.video" })
    | undefined;
  remainingSections: SectionDTO[];
};

export function useHomeSections(sections: SectionDTO[]): HomeSectionMap {
  const advantagesSection = sections.find(
    (s): s is HomeSectionMap["advantagesSection"] & NonNullable<unknown> =>
      s.__component === "sections.advantages",
  );

  const promoSection = sections.find(
    (s): s is HomeSectionMap["promoSection"] & NonNullable<unknown> =>
      s.__component === "sections.promo-slider",
  );

  const linkedResourcesSection = sections.find(
    (s): s is HomeSectionMap["linkedResourcesSection"] & NonNullable<unknown> =>
      s.__component === "sections.linked-resources",
  );

  const videoSection = sections.find(
    (s): s is HomeSectionMap["videoSection"] & NonNullable<unknown> =>
      s.__component === "sections.video",
  );

  const remainingSections = sections.filter(
    (s) =>
      s.__component !== "sections.linked-resources" &&
      s.__component !== "sections.promo-slider" &&
      s.__component !== "sections.advantages" &&
      s.__component !== "sections.video",
  );

  return {
    advantagesSection,
    promoSection,
    linkedResourcesSection,
    videoSection,
    remainingSections,
  };
}
