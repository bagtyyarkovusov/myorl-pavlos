import { StructuredData } from "@/components/StructuredData";
import { buildArticleLd } from "@/lib/structured-data/article";
import { buildContactPointLd } from "@/lib/structured-data/contact-point";
import { buildFaqPageLd } from "@/lib/structured-data/faq";
import { buildImageObjectLd } from "@/lib/structured-data/image-object";
import { buildMedicalBusinessLd } from "@/lib/structured-data/medical-business";
import { buildMedicalConditionLd } from "@/lib/structured-data/medical-condition";
import { buildMedicalProcedureLd } from "@/lib/structured-data/medical-procedure";
import { buildPageBreadcrumbLd } from "@/lib/structured-data/page-breadcrumbs";
import { buildPhysicianLd } from "@/lib/structured-data/physician";
import { getPageSchemas } from "@/lib/structured-data/seo-schema-map";
import { buildVideoObjectLd } from "@/lib/structured-data/video-object";
import { buildWebPageLd } from "@/lib/structured-data/webpage";
import { buildWebSiteLd } from "@/lib/structured-data/website";
import { buildContactRenderModel } from "@/lib/contact/contact-render-model";
import { hrefForPage } from "@/lib/cms/navigation";
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

function formatIsoDate(value?: string | null): string | undefined {
  if (!value) return undefined;
  return value.slice(0, 10);
}

function firstClinicPhone(sections: SectionDTO[]): string | undefined {
  const contact = sections.find(
    (s): s is Extract<SectionDTO, { __component: "sections.contact" }> =>
      s.__component === "sections.contact",
  );
  if (!contact) return undefined;
  return buildContactRenderModel(contact).primaryPhoneAction?.label ?? undefined;
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
    const phone =
      firstClinicPhone(page.sections) ??
      globalSettings?.phoneDisplay?.trim() ??
      globalSettings?.phoneTel?.trim() ??
      undefined;
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
        telephone:
          globalSettings?.phoneDisplay?.trim() ??
          globalSettings?.phoneTel?.trim() ??
          firstClinicPhone(page.sections) ??
          undefined,
        address: globalSettings?.address ?? undefined,
        imageUrls: page.seo.ogImage?.url ? [page.seo.ogImage.url] : undefined,
        aggregateRating,
      }),
    );
  }

  const pageUrl = new URL(hrefForPage(page), siteUrl).toString();
  const description = page.seo.metaDescription ?? undefined;
  const locale = page.locale;

  if (schemaTypes.has("Physician")) {
    blocks.push(buildPhysicianLd({ pageUrl, description, locale }));
  }

  if (schemaTypes.has("MedicalProcedure")) {
    blocks.push(
      buildMedicalProcedureLd({
        title: page.title,
        pageUrl,
        description,
        locale,
        datePublished: formatIsoDate(page.publishedAt),
        dateModified: formatIsoDate(page.updatedAt),
      }),
    );
  }

  if (schemaTypes.has("MedicalCondition")) {
    blocks.push(
      buildMedicalConditionLd({
        title: page.title,
        pageUrl,
        description,
        locale,
        datePublished: formatIsoDate(page.publishedAt),
        dateModified: formatIsoDate(page.updatedAt),
      }),
    );
  }

  if (schemaTypes.has("Article")) {
    blocks.push(
      buildArticleLd({
        title: page.title,
        pageUrl,
        description,
        locale,
        datePublished: formatIsoDate(page.publishedAt),
        dateModified: formatIsoDate(page.updatedAt),
      }),
    );
  }

  return <StructuredData data={{ "@context": "https://schema.org", "@graph": blocks }} />;
}
