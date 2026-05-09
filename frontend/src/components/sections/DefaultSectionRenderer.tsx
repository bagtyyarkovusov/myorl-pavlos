import Image from "next/image";

import { CmsHtml } from "@/components/CmsHtml";
import { GalleryWithLightbox } from "@/components/GalleryWithLightbox";
import { SectionGrid } from "@/components/SectionGrid";
import { Card } from "@/components/design-system";
import { toSocialLinkDTO } from "@/lib/cms/dto";
import type { Density } from "@/lib/cms/density";
import type { Locale, MediaDTO, SectionDTO } from "@/lib/cms/types";

import { DisclosureList, TabsPanel } from "./DisclosurePanels";
import { SECTION_COLUMN_DEFAULTS } from "./grid-defaults";
import { UnknownSection } from "./UnknownSection";
import styles from "./SectionRenderer.module.css";

function ResponsiveImage({ media, alt }: { media?: MediaDTO | null; alt: string }) {
  if (!media?.url) {
    return null;
  }

  return (
    <Image
      src={media.url}
      alt={alt}
      width={media.width ?? 960}
      height={media.height ?? 640}
      sizes="(min-width: 960px) 33vw, (min-width: 640px) 50vw, 100vw"
    />
  );
}

export function DefaultSectionRenderer({
  section,
  density = "focused",
  locale = "el",
  galleryMode = "cards",
  sectionIndex = 0,
}: {
  section: SectionDTO;
  density?: Density;
  locale?: Locale;
  galleryMode?: "cards" | "lightbox";
  sectionIndex?: number;
}) {
  switch (section.__component) {
    case "sections.promo-slider":
      return (
        <SectionGrid columns={SECTION_COLUMN_DEFAULTS["sections.promo-slider"]}>
          {section.slides.map((slide, index) => (
            <article
              className={`${styles["content-card"]} ${styles["media-card"]}`}
              key={`${slide.title ?? "slide"}-${index}`}
            >
              <ResponsiveImage media={slide.image} alt={slide.title ?? ""} />
              {slide.title ? <h3>{slide.title}</h3> : null}
              <CmsHtml html={slide.description} />
              {slide.targetUrl ? <a href={slide.targetUrl}>Open</a> : null}
            </article>
          ))}
        </SectionGrid>
      );
    case "sections.linked-resources":
      return (
        <SectionGrid columns={SECTION_COLUMN_DEFAULTS["sections.linked-resources"]}>
          {section.items.map((item, index) => (
            <Card
              key={`${item.title ?? "resource"}-${index}`}
              title={item.title}
              description={item.description}
              href={resolveResourceHref(item, locale)}
              image={item.image}
              density={density}
              ctaLabel="Open"
            />
          ))}
        </SectionGrid>
      );
    case "sections.social-links":
      return (
        <SectionGrid columns={SECTION_COLUMN_DEFAULTS["sections.social-links"]}>
          <ul className={styles["inline-list"]}>
            {section.links
              .map(toSocialLinkDTO)
              .filter((link): link is NonNullable<typeof link> => link !== null)
              .map((link) => (
                <li key={`${link.platform}-${link.url}`}>
                  <a href={link.url}>{link.label}</a>
                </li>
              ))}
          </ul>
        </SectionGrid>
      );
    case "sections.video":
      return (
        <SectionGrid columns={SECTION_COLUMN_DEFAULTS["sections.video"]}>
          {section.videos.map((video, index) => (
            <article
              className={`${styles["content-card"]} ${styles["media-card"]}`}
              key={`${video.title ?? "video"}-${index}`}
            >
              {video.title ? <h3>{video.title}</h3> : null}
              {video.videoMp4?.url || video.videoWebm?.url ? (
                <video controls poster={video.thumbnail?.url ?? undefined}>
                  {video.videoMp4?.url ? (
                    <source src={video.videoMp4.url} type="video/mp4" />
                  ) : null}
                  {video.videoWebm?.url ? (
                    <source src={video.videoWebm.url} type="video/webm" />
                  ) : null}
                </video>
              ) : (
                <ResponsiveImage media={video.thumbnail} alt={video.title ?? ""} />
              )}
              {video.videoTags ? <p>{video.videoTags}</p> : null}
            </article>
          ))}
        </SectionGrid>
      );
    case "sections.advantages":
      return (
        <SectionGrid columns={SECTION_COLUMN_DEFAULTS["sections.advantages"]}>
          {section.items.map((item, index) => (
            <Card
              key={`${item.title ?? "advantage"}-${index}`}
              title={item.title}
              description={item.description}
              href="#"
              density={density}
            />
          ))}
        </SectionGrid>
      );
    case "sections.accordion":
      return (
        <SectionGrid columns={SECTION_COLUMN_DEFAULTS["sections.accordion"]}>
          <DisclosureList items={section.items.map((item) => [item.title, item.content])} />
        </SectionGrid>
      );
    case "sections.faq":
      return (
        <SectionGrid columns={SECTION_COLUMN_DEFAULTS["sections.faq"]}>
          <DisclosureList items={section.items.map((item) => [item.question, item.answer])} />
        </SectionGrid>
      );
    case "sections.tabs":
      return <TabsPanel items={section.items} />;
    case "sections.gallery":
      if (galleryMode === "lightbox") {
        return (
          <GalleryWithLightbox
            items={section.items}
            className={styles["gallery-grid"]}
            itemClassName={`${styles["content-card"]} ${styles["media-card"]}`}
          />
        );
      }

      return (
        <SectionGrid columns={SECTION_COLUMN_DEFAULTS["sections.gallery"]}>
          {section.items.map((item, index) => (
            <Card
              key={`${item.caption ?? "gallery"}-${index}`}
              title={item.caption}
              image={item.image}
              href="#"
              density={density}
            />
          ))}
        </SectionGrid>
      );
    case "sections.contact":
      return (
        <SectionGrid columns={SECTION_COLUMN_DEFAULTS["sections.contact"]}>
          {section.details.map((detail, index) => (
            <article className={styles["content-card"]} key={`${detail.type}-${index}`}>
              <h3>{detail.type}</h3>
              <CmsHtml className="cms-html" html={detail.valueHtml} />
            </article>
          ))}
          {section.clinics.map((clinic) => (
            <article className={styles["content-card"]} key={clinic.name}>
              <h3>{clinic.name}</h3>
              <CmsHtml className="cms-html" html={clinic.addressHtml} />
              {clinic.phone ? <p>{clinic.phone}</p> : null}
              {clinic.email ? <p>{clinic.email}</p> : null}
            </article>
          ))}
        </SectionGrid>
      );
    case "sections.unknown":
      return <UnknownSection section={section} />;
    default:
      return (
        <UnknownSection section={section as { __component: string; heading?: string | null }} />
      );
  }
}

function resolveResourceHref(
  item: Extract<SectionDTO, { __component: "sections.linked-resources" }>["items"][number],
  locale: Locale,
): string {
  if (item.targetUrl) {
    return item.targetUrl;
  }

  return item.targetPage?.slug ? `/${locale}/${item.targetPage.slug}` : `/${locale}/sitemap`;
}
