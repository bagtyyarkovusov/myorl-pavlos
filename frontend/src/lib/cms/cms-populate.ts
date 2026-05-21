/**
 * Strapi populate definitions for the CMS API.
 *
 * These constants describe the exact shape of relational data that the
 * frontend requests from Strapi. They are the single source of truth for
 * what fields, components, and nested relations are populated per endpoint.
 *
 * @see ADR-001 — Next.js Semantic DTO Boundary
 */

/**
 * Deep populate definition for the full page endpoint.
 *
 * Requests all section components, media, tags, SEO, parent page, and
 * localizations required to build a complete {@link PageDTO}.
 */
export const PAGE_POPULATE = {
  seo: { populate: ["ogImage"] },
  parentPage: { fields: ["documentId", "slug", "title"] },
  localizations: { fields: ["documentId", "locale", "slug", "title"] },
  tags: { fields: ["name", "slug"] },
  featuredImage: true,
  imageCenter: true,
  pageSections: {
    on: {
      "sections.promo-slider": {
        populate: {
          slides: {
            populate: {
              image: true,
              targetPage: { fields: ["documentId", "slug", "title", "excerpt"] },
            },
          },
        },
      },
      "sections.linked-resources": {
        populate: {
          items: {
            populate: {
              targetPage: {
                fields: ["documentId", "slug", "title"],
                populate: ["imageCenter", "featuredImage"],
              },
            },
          },
        },
      },
      "sections.social-links": {
        populate: { links: true },
      },
      "sections.video": {
        populate: {
          videos: { populate: ["thumbnail", "videoMp4", "videoWebm"] },
        },
      },
      "sections.advantages": {
        populate: { items: true },
      },
      "sections.accordion": {
        populate: { items: true },
      },
      "sections.faq": {
        populate: { items: true },
      },
      "sections.tabs": {
        populate: { items: true },
      },
      "sections.gallery": {
        populate: { items: { populate: ["image"] } },
      },
      "sections.contact": {
        populate: { details: true, clinics: true },
      },
    },
  },
} as const;

/**
 * Minimal populate for the navigation endpoint.
 *
 * Requests parent page reference, tags (for directory filtering), images,
 * and hierarchy fields needed to build the tree.
 */
export const NAVIGATION_POPULATE = {
  parentPage: { fields: ["documentId", "slug", "title"] },
  tags: { fields: ["name", "slug"] },
  featuredImage: true,
  imageCenter: true,
  seo: { populate: ["ogImage"] },
} as const;

/**
 * Populate for the sitemap endpoint.
 *
 * Requests SEO fields, parent page, and localizations so that each entry can
 * emit canonical URLs and hreflang alternates.
 */
export const SITEMAP_POPULATE = {
  seo: { populate: ["ogImage"] },
  parentPage: { fields: ["documentId", "slug", "title"] },
  localizations: { fields: ["documentId", "locale", "slug", "title"] },
} as const;

/**
 * Populate for the video library directory.
 */
export const VIDEO_ENTRY_POPULATE = {
  relatedArticle: { fields: ["documentId", "slug", "title", "locale"] },
} as const;
