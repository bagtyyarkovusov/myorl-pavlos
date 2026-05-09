/**
 * Idempotent seed for the design-system audit reference page.
 *
 * Creates a `design-system-audit` page (one per supported locale) populated
 * with one of every section component, so the page can serve as a visual
 * regression baseline, an editor reference, and an a11y checklist target.
 *
 * Idempotency: lookup by (slug, locale). If a page already exists in any
 * status (draft or published), this seed is a no-op for that locale. Editor
 * changes are NEVER overwritten — the seed only fills in missing pages.
 *
 * Closes PRD #103 implementation decision 22 + further-notes recommendation.
 */

import type { Core } from "@strapi/strapi";

const AUDIT_SLUG = "design-system-audit";
const SUPPORTED_LOCALES = ["el", "ru"] as const;

type Locale = (typeof SUPPORTED_LOCALES)[number];

const TITLES: Record<Locale, string> = {
  el: "Έλεγχος Design System",
  ru: "Аудит дизайн-системы",
};

const INTROS: Record<Locale, string> = {
  el:
    "<p>Αυτή η σελίδα συγκεντρώνει μία παρουσία κάθε ενότητας του CMS για οπτικό έλεγχο και έλεγχο προσβασιμότητας.</p>",
  ru:
    "<p>Эта страница содержит по одному примеру каждого компонента CMS для визуальной регрессии и проверки доступности.</p>",
};

function buildPageSections(): Array<Record<string, unknown>> {
  return [
    {
      __component: "sections.promo-slider",
      heading: "Promo slider",
      intro: "<p>Carousel of editorial highlights.</p>",
      slides: [],
    },
    {
      __component: "sections.advantages",
      heading: "Advantages",
      intro: "<p>Bullet-style highlights of the practice's strengths.</p>",
      items: [],
    },
    {
      __component: "sections.linked-resources",
      heading: "Linked resources",
      intro: "<p>Cross-links to related editorial pages.</p>",
      items: [],
    },
    {
      __component: "sections.video",
      heading: "Video",
      intro: "<p>Embedded clinical or testimonial videos.</p>",
      videos: [],
    },
    {
      __component: "sections.gallery",
      heading: "Gallery",
      intro: "<p>Image grid with lightbox.</p>",
      items: [],
    },
    {
      __component: "sections.faq",
      heading: "FAQ",
      intro: "<p>Frequently asked questions.</p>",
      items: [],
    },
    {
      __component: "sections.accordion",
      heading: "Accordion",
      intro: "<p>Collapsible content rows.</p>",
      items: [],
    },
    {
      __component: "sections.tabs",
      heading: "Tabs",
      intro: "<p>Tabbed content panel.</p>",
      items: [],
    },
    {
      __component: "sections.contact",
      heading: "Contact",
      intro: "<p>Contact details and clinic addresses.</p>",
      details: [],
      clinics: [],
    },
    {
      __component: "sections.social-links",
      heading: "Social links",
      intro: "<p>External social-media destinations.</p>",
      links: [],
    },
  ];
}

function buildPageData(locale: Locale): Record<string, unknown> {
  return {
    slug: AUDIT_SLUG,
    title: TITLES[locale],
    pageType: "content",
    layoutVariant: "standard",
    excerpt:
      locale === "el"
        ? "Σελίδα αναφοράς με όλες τις ενότητες."
        : "Справочная страница со всеми компонентами.",
    content: INTROS[locale],
    hideFromMenu: true,
    isFolder: false,
    pageSections: buildPageSections(),
    seo: {
      metaTitle: TITLES[locale],
      metaDescription:
        locale === "el"
          ? "Σελίδα ελέγχου design system με όλους τους τύπους ενοτήτων."
          : "Страница аудита дизайн-системы со всеми типами компонентов.",
      robotsNoindex: true,
      robotsNofollow: false,
      sitemapExclude: true,
    },
  };
}

/**
 * Seeds the design-system audit page in each supported locale. Safe to run on
 * every Strapi boot — a no-op when the page already exists.
 */
export async function seedDesignSystemAudit(strapi: Core.Strapi): Promise<void> {
  for (const locale of SUPPORTED_LOCALES) {
    try {
      const existing = await strapi.documents("api::page.page").findMany({
        filters: { slug: AUDIT_SLUG },
        locale,
        status: "draft",
      });

      if (Array.isArray(existing) && existing.length > 0) {
        strapi.log.info(
          `[seed-design-system-audit] '${AUDIT_SLUG}' (${locale}) already exists — skipping`,
        );
        continue;
      }

      // Strapi's typed API expects a schema-derived Data.Input shape that
      // can't be expressed cleanly for a heterogeneous DynamicZone seed.
      // Cast at the boundary; the runtime payload matches the schema.
      await strapi.documents("api::page.page").create({
        data: buildPageData(locale) as never,
        locale,
      });

      strapi.log.info(`[seed-design-system-audit] Created '${AUDIT_SLUG}' (${locale})`);
    } catch (err) {
      strapi.log.error(
        `[seed-design-system-audit] Failed to seed '${AUDIT_SLUG}' (${locale})`,
        err,
      );
    }
  }
}
