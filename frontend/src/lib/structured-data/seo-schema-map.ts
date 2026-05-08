import type { SectionDTO } from "@/lib/cms/types";

const SECTION_SCHEMA_MAP: Record<string, string[]> = {
  "sections.faq": ["FAQPage"],
  "sections.video": ["VideoObject"],
  "sections.gallery": ["ImageObject"],
  "sections.contact": ["ContactPoint"],
};

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
