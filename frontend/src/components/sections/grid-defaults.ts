import { getSectionGridColumns } from "@/lib/sections/section-definitions";

/**
 * Grid column defaults for section rendering.
 *
 * Delegates to the canonical {@link getSectionGridColumns} registry so
 * column counts are declared in one place (`lib/sections/section-definitions.ts`).
 */
export const SECTION_COLUMN_DEFAULTS: Record<string, 1 | 2 | 3 | 4> = {
  get "sections.faq"() {
    return getSectionGridColumns("sections.faq");
  },
  get "sections.accordion"() {
    return getSectionGridColumns("sections.accordion");
  },
  get "sections.contact"() {
    return getSectionGridColumns("sections.contact");
  },
  get "sections.advantages"() {
    return getSectionGridColumns("sections.advantages");
  },
  get "sections.linked-resources"() {
    return getSectionGridColumns("sections.linked-resources");
  },
  get "sections.gallery"() {
    return getSectionGridColumns("sections.gallery");
  },
  get "sections.video"() {
    return getSectionGridColumns("sections.video");
  },
  get "sections.promo-slider"() {
    return getSectionGridColumns("sections.promo-slider");
  },
  get "sections.tabs"() {
    return getSectionGridColumns("sections.tabs");
  },
  get "sections.social-links"() {
    return getSectionGridColumns("sections.social-links");
  },
};
