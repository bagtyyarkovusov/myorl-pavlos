/**
 * Migrates section data from dedicated component fields into the unified
 * pageSections DynamicZone for all page types.
 *
 * Before this migration, section content was stored in two parallel mechanisms:
 * 1. A DynamicZone (pageSections, visible only for pageType === "home")
 * 2. Dedicated component fields (faqSection, accordionSection, etc.)
 *
 * This script reads each non-home page's dedicated field, inserts it as a
 * pageSections DynamicZone entry, and nulls the dedicated field.
 *
 * Runs once per SEED_VERSION — idempotent: pages that already have the
 * section in pageSections are safely skipped.
 */

import type { Core } from "@strapi/strapi";

const SEED_VERSION = "v1";
const MARKER_KEY = "migrate_sections_version";

type SectionComponent =
  | "sections.faq"
  | "sections.accordion"
  | "sections.tabs"
  | "sections.gallery"
  | "sections.contact";

const DEDICATED_FIELDS: Array<{ field: string; component: SectionComponent }> = [
  { field: "faqSection", component: "sections.faq" },
  { field: "accordionSection", component: "sections.accordion" },
  { field: "tabsSection", component: "sections.tabs" },
  { field: "gallerySection", component: "sections.gallery" },
  { field: "contactSection", component: "sections.contact" },
];

function hasData(value: unknown): value is Record<string, unknown> {
  if (value === null || value === undefined) return false;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === "object") return Object.keys(value as object).length > 0;
  return true;
}

function sectionAlreadyInDynamicZone(
  pageSections: unknown,
  component: SectionComponent,
): boolean {
  return (
    Array.isArray(pageSections) &&
    pageSections.some(
      (entry: { __component?: string }) =>
        entry && entry.__component === component,
    )
  );
}

export async function migrateSections(strapi: Core.Strapi): Promise<void> {
  const store = strapi.store({ type: "plugin", name: "content-manager" });

  const markerValue = await store.get({ key: MARKER_KEY });
  if (markerValue === SEED_VERSION) {
    return;
  }

  const populate = Object.fromEntries(
    DEDICATED_FIELDS.map(({ field }) => [field, true]),
  );

  const pages = await strapi.documents("api::page.page").findMany({
    populate: { pageSections: true, ...populate },
    filters: {
      pageType: { $ne: "home" },
    },
  });

  let migrated = 0;

  for (const page of pages) {
    for (const { field, component } of DEDICATED_FIELDS) {
      const dedicatedValue = page[field] as unknown;

      if (!hasData(dedicatedValue)) continue;
      if (sectionAlreadyInDynamicZone(page.pageSections, component)) continue;

      const sectionEntry = {
        __component: component as SectionComponent,
        ...(dedicatedValue as Record<string, unknown>),
      };

      const existingSections = Array.isArray(page.pageSections)
        ? (page.pageSections as Array<{ __component: string } & Record<string, unknown>>)
        : [];

      try {
        await strapi.documents("api::page.page").update({
          documentId: page.documentId,
          data: {
            pageSections: [...existingSections, sectionEntry] as unknown,
            [field]: null,
          } as unknown,
        });
        migrated++;
        strapi.log.info(
          `[migrate-sections] migrated ${component} from ${field} to pageSections for page "${page.title ?? page.documentId}"`,
        );
      } catch (err) {
        strapi.log.error(
          `[migrate-sections] failed to migrate ${component} for page "${page.title ?? page.documentId}"`,
          err,
        );
      }
    }
  }

  await store.set({ key: MARKER_KEY, value: SEED_VERSION });
  strapi.log.info(
    `[migrate-sections] migration complete — ${migrated} section(s) migrated to DynamicZone`,
  );
}
