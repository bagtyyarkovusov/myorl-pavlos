import { StructuredData } from "@/components/StructuredData";
import { buildContactPointLd } from "@/lib/structured-data/contact-point";
import { buildFaqPageLd } from "@/lib/structured-data/faq";
import { buildImageObjectLd } from "@/lib/structured-data/image-object";
import { buildMedicalBusinessLd } from "@/lib/structured-data/medical-business";
import { buildPageBreadcrumbLd } from "@/lib/structured-data/page-breadcrumbs";
import { getPageSchemas } from "@/lib/structured-data/seo-schema-map";
import { buildVideoObjectLd } from "@/lib/structured-data/video-object";
import { buildWebPageLd } from "@/lib/structured-data/webpage";
import { buildWebSiteLd } from "@/lib/structured-data/website";
import type { GlobalSettingsDTO, PageDTO, SectionDTO } from "@/lib/cms/types";
import type { HomeTestimonialsPayload } from "@/lib/testimonials/home-payload";

type StructuredDataComposerProps = {
  page: PageDTO;
  /** Canonical site origin. Required so the composer never reads server-only env. */
  siteUrl: string;
  /** Brand name used for `WebSite` and `MedicalBusiness`. */
  brandName?: string;
  /** Localised label for the home crumb in `BreadcrumbList`. */
  homeLabel?: string;
  /** Optional global Strapi settings (drives MedicalBusiness phone/address). */
  globalSettings?: GlobalSettingsDTO | null;
  /** Optional home testimonials (drives MedicalBusiness aggregateRating). */
  homeTestimonials?: HomeTestimonialsPayload | null;
};

const DEFAULT_BRAND_NAME = "MyORL";
const DEFAULT_HOME_LABEL = "Home";

function firstClinicPhone(sections: SectionDTO[]): string | undefined {
  const contact = sections.find(
    (s): s is Extract<SectionDTO, { __component: "sections.contact" }> =>
      s.__component === "sections.contact",
  );
  return contact?.clinics.find((c) => c.phone)?.phone ?? undefined;
}

/**
 * Page-level JSON-LD entry point.
 *
 * Always emits `WebSite`, `WebPage` (honoring `seo.schemaType`), and
 * `BreadcrumbList` (except on the home page). Section-driven and
 * page-type-driven schemas are added per the {@link getPageSchemas} map.
 *
 * Layouts MUST NOT render their own `<StructuredData>` tags — pass any
 * layout-specific inputs through props on this component instead.
 */
export function StructuredDataComposer({
  page,
  siteUrl,
  brandName = DEFAULT_BRAND_NAME,
  homeLabel = DEFAULT_HOME_LABEL,
  globalSettings,
  homeTestimonials,
}: StructuredDataComposerProps) {
  const blocks: Record<string, unknown>[] = [];

  blocks.push(buildWebSiteLd(siteUrl, brandName));
  blocks.push(buildWebPageLd(page, siteUrl));

  const breadcrumbLd = buildPageBreadcrumbLd(page, siteUrl, homeLabel);
  if (breadcrumbLd) {
    blocks.push(breadcrumbLd);
  }

  const schemaTypes = new Set(getPageSchemas(page));

  if (schemaTypes.has("FAQPage")) {
    const items = page.sections
      .filter(
        (s): s is Extract<SectionDTO, { __component: "sections.faq" }> =>
          s.__component === "sections.faq",
      )
      .flatMap((s) =>
        s.items
          .filter((i) => i.question && i.answer)
          .map((i) => ({ question: i.question!, answer: i.answer! })),
      );
    const ld = buildFaqPageLd(items);
    if (ld) blocks.push(ld);
  }

  if (schemaTypes.has("VideoObject")) {
    for (const section of page.sections) {
      if (section.__component !== "sections.video") continue;
      const videos = buildVideoObjectLd(section.videos);
      if (!videos) continue;
      for (const video of videos) {
        blocks.push({ "@context": "https://schema.org", ...video });
      }
    }
  }

  if (schemaTypes.has("ImageObject")) {
    for (const section of page.sections) {
      if (section.__component !== "sections.gallery") continue;
      const images = buildImageObjectLd(section.items);
      if (!images) continue;
      for (const image of images) {
        blocks.push({ "@context": "https://schema.org", ...image });
      }
    }
  }

  if (schemaTypes.has("ContactPoint")) {
    const phone = firstClinicPhone(page.sections) ?? globalSettings?.phoneTel ?? undefined;
    if (phone) {
      blocks.push(buildContactPointLd(phone));
    }
  }

  if (schemaTypes.has("MedicalBusiness")) {
    const aggregateRating =
      homeTestimonials?.aggregateRating != null && homeTestimonials?.userRatingCount != null
        ? {
            ratingValue: homeTestimonials.aggregateRating,
            reviewCount: homeTestimonials.userRatingCount,
          }
        : undefined;

    blocks.push(
      buildMedicalBusinessLd({
        siteUrl,
        name: brandName,
        description: page.seo.metaDescription ?? undefined,
        telephone: globalSettings?.phoneTel ?? firstClinicPhone(page.sections) ?? undefined,
        address: globalSettings?.address ?? undefined,
        imageUrls: page.seo.ogImage?.url ? [page.seo.ogImage.url] : undefined,
        aggregateRating,
      }),
    );
  }

  return <StructuredData data={{ "@context": "https://schema.org", "@graph": blocks }} />;
}
