// Auto-generated from Strapi schemas. Do not edit manually.
// Regenerate via: npm run generate --prefix packages/shared-types

export type PageType =
  | "home"
  | "content"
  | "faq"
  | "accordion"
  | "tabs"
  | "gallery"
  | "contact"
  | "system";

export type LayoutVariant =
  | "home"
  | "standard"
  | "service-article"
  | "service-faq"
  | "service-accordion"
  | "service-tabs"
  | "clinic-gallery"
  | "office-gallery"
  | "encyclopedia-article"
  | "section-index"
  | "clinic-index"
  | "video-index"
  | "encyclopedia-index"
  | "appointment-form"
  | "not-found"
  | "search-results"
  | "sitemap"
  | "specialized-article"
  | "section-hub"
  | "contact"
  | "testimonials-index";

export type SectionComponent =
  | "sections.promo-slider"
  | "sections.home-hero"
  | "sections.linked-resources"
  | "sections.social-links"
  | "sections.video"
  | "sections.advantages"
  | "sections.home-testimonials-teaser"
  | "sections.home-notice"
  | "sections.accordion"
  | "sections.faq"
  | "sections.tabs"
  | "sections.gallery"
  | "sections.contact";

export type FooterCategory =
  | "services"
  | "patients"
  | "company"
  | "none";

export type SitemapChangeFrequency =
  | "always"
  | "hourly"
  | "daily"
  | "weekly"
  | "monthly"
  | "yearly"
  | "never";

export type PageSchemaType =
  | "WebPage"
  | "MedicalWebPage"
  | "AboutPage"
  | "ContactPage"
  | "CollectionPage";

export type DisclaimerOverride = "default" | "force-show" | "force-hide";

// RenderMode is frontend-native and not derived from Strapi schema
export type RenderMode = "cms" | "frontend-native";
