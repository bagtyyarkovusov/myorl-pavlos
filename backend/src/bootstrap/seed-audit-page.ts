/**
 * Seeds a reference audit page that stacks all 10 section types
 * for visual regression testing and developer onboarding.
 *
 * Idempotent: skips if a page with slug "design-system-audit" already exists.
 */

import type { Core } from "@strapi/strapi";

const AUDIT_SLUG = "design-system-audit";

const AUDIT_SECTIONS = [
  { __component: "sections.promo-slider" as const, heading: "Promo Slider", slides: [] },
  { __component: "sections.advantages" as const, heading: "Advantages", items: [] },
  { __component: "sections.linked-resources" as const, heading: "Linked Resources", items: [] },
  { __component: "sections.video" as const, heading: "Video", videos: [] },
  { __component: "sections.accordion" as const, heading: "Accordion", items: [] },
  { __component: "sections.faq" as const, heading: "FAQ", items: [] },
  { __component: "sections.tabs" as const, heading: "Tabs", items: [] },
  { __component: "sections.gallery" as const, heading: "Gallery", items: [] },
  { __component: "sections.contact" as const, heading: "Contact", clinics: [] },
  { __component: "sections.social-links" as const, heading: "Social Links", links: [] },
];

export async function seedAuditPage(strapi: Core.Strapi): Promise<void> {
  const existing = await strapi.documents("api::page.page").findFirst({
    filters: { slug: AUDIT_SLUG },
  });

  if (existing) {
    strapi.log.info(`[seed-audit-page] audit page "${AUDIT_SLUG}" already exists — skipping`);
    return;
  }

  try {
    await strapi.documents("api::page.page").create({
      data: {
        title: "Design System Audit",
        slug: AUDIT_SLUG,
        pageType: "content",
        layoutVariant: "standard",
        locale: "el",
        publishedAt: new Date(),
        pageSections: AUDIT_SECTIONS,
      },
    });
    strapi.log.info(`[seed-audit-page] created audit page "${AUDIT_SLUG}" with ${AUDIT_SECTIONS.length} sections`);
  } catch (err) {
    strapi.log.error(`[seed-audit-page] failed to create audit page`, err);
  }
}
