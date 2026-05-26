import type { PageDTO, PageType, SectionDTO } from "@/lib/cms/types";
import type { LayoutVariant } from "@myorl-pavlos/shared-types";
import { getSectionSchemaTypes } from "@/lib/sections/section-definitions";

const PAGE_TYPE_SCHEMA_MAP: Partial<Record<PageType, string[]>> = {
  // The homepage always advertises the practice itself, even when the editor
  // hasn't placed a contact section on it.
  home: ["MedicalBusiness"],
};

const PHYSICIAN_SLUG = "viografiko";

const LAYOUT_VARIANT_SCHEMA_MAP: Partial<Record<LayoutVariant, string[]>> = {
  "service-article": ["MedicalProcedure"],
  "service-faq": ["MedicalProcedure"],
  "service-accordion": ["MedicalProcedure"],
  "service-tabs": ["MedicalProcedure"],
  "encyclopedia-article": ["MedicalCondition"],
  "specialized-article": ["Article"],
};

/**
 * Returns the deduplicated list of structured-data `@type` strings that apply
 * to a sequence of CMS sections. Used for unit-level checks and as the
 * building block for {@link getPageSchemas}.
 */
export function getSectionSchemas(sections: SectionDTO[]): string[] {
  const schemaSet = new Set<string>();

  for (const section of sections) {
    const schemas = getSectionSchemaTypes(section.__component);
    for (const schema of schemas) {
      schemaSet.add(schema);
    }
  }

  return [...schemaSet];
}

/**
 * Returns the deduplicated list of structured-data `@type` strings that apply
 * to an entire page, combining `pageType`-level schemas (e.g. homepage
 * `MedicalBusiness`) with section-level schemas and `layoutVariant`-driven
 * schemas. The `WebSite`, `WebPage`, and `BreadcrumbList` types are emitted
 * unconditionally by the composer and are NOT included here.
 */
export function getPageSchemas(
  page: Pick<PageDTO, "pageType" | "sections" | "slug" | "layoutVariant">,
): string[] {
  const schemaSet = new Set<string>(getSectionSchemas(page.sections));

  const pageTypeSchemas = PAGE_TYPE_SCHEMA_MAP[page.pageType];
  if (pageTypeSchemas) {
    for (const schema of pageTypeSchemas) {
      schemaSet.add(schema);
    }
  }

  if (page.slug === PHYSICIAN_SLUG) {
    schemaSet.add("Physician");
  }

  const variantSchemas = LAYOUT_VARIANT_SCHEMA_MAP[page.layoutVariant];
  if (variantSchemas) {
    for (const schema of variantSchemas) {
      schemaSet.add(schema);
    }
  }

  return [...schemaSet];
}
