import { errors } from "@strapi/utils";

const { ApplicationError } = errors;

export const HOME_ALLOWED_SECTION_COMPONENTS = [
  "sections.home-hero",
  "sections.promo-slider",
  "sections.advantages",
  "sections.linked-resources",
  "sections.home-resource-group",
  "sections.video",
  "sections.home-testimonials-teaser",
  "sections.home-notice",
] as const;

const HOME_ALLOWED_SECTION_SET = new Set<string>(HOME_ALLOWED_SECTION_COMPONENTS);

export type PageSectionPolicyInput = {
  layoutVariant?: unknown;
  pageType?: unknown;
  pageSections?: unknown;
};

export function validatePageSectionsForLayout(input: PageSectionPolicyInput): void {
  if (input.layoutVariant !== "home" && input.pageType !== "home") return;
  if (!Array.isArray(input.pageSections)) return;

  for (const section of input.pageSections) {
    if (!isSectionRecord(section)) continue;

    const component = section.__component;
    if (typeof component === "string" && !HOME_ALLOWED_SECTION_SET.has(component)) {
      throw new ApplicationError(`Home pages cannot use ${component}`, {
        component,
        allowedComponents: HOME_ALLOWED_SECTION_COMPONENTS,
      });
    }
  }
}

function isSectionRecord(value: unknown): value is { __component?: unknown } {
  return typeof value === "object" && value !== null;
}
