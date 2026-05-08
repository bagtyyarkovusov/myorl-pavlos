import type { PageDTO, PageType, SectionDTO } from "@/lib/cms/types";

const SECTION_SCHEMA_MAP: Record<string, string[]> = {
  "sections.faq": ["FAQPage"],
  "sections.video": ["VideoObject"],
  "sections.gallery": ["ImageObject"],
  // Contact sections contribute both ContactPoint AND MedicalBusiness so
  // search engines can render rich call/visit affordances.
  "sections.contact": ["ContactPoint", "MedicalBusiness"],
};

const PAGE_TYPE_SCHEMA_MAP: Partial<Record<PageType, string[]>> = {
  // The homepage always advertises the practice itself, even when the editor
  // hasn't placed a contact section on it.
  home: ["MedicalBusiness"],
};

/**
 * Returns the deduplicated list of structured-data `@type` strings that apply
 * to a sequence of CMS sections. Used for unit-level checks and as the
 * building block for {@link getPageSchemas}.
 */
export function getSectionSchemas(sections: SectionDTO[]): string[] {
  const schemaSet = new Set<string>();

  for (const section of sections) {
    const schemas = SECTION_SCHEMA_MAP[section.__component];
    if (schemas) {
      for (const schema of schemas) {
        schemaSet.add(schema);
      }
    }
  }

  return [...schemaSet];
}

/**
 * Returns the deduplicated list of structured-data `@type` strings that apply
 * to an entire page, combining `pageType`-level schemas (e.g. homepage
 * `MedicalBusiness`) with section-level schemas. The `WebSite`, `WebPage`,
 * and `BreadcrumbList` types are emitted unconditionally by the composer and
 * are NOT included here.
 */
export function getPageSchemas(page: Pick<PageDTO, "pageType" | "sections">): string[] {
  const schemaSet = new Set<string>(getSectionSchemas(page.sections));

  const pageTypeSchemas = PAGE_TYPE_SCHEMA_MAP[page.pageType];
  if (pageTypeSchemas) {
    for (const schema of pageTypeSchemas) {
      schemaSet.add(schema);
    }
  }

  return [...schemaSet];
}
