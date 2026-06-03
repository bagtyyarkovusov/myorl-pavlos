import { CmsHtml } from "@/components/CmsHtml";
import { ButtonLink } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getPageStrings } from "@/lib/i18n/page";
import { PageHeader, type PageLayoutProps } from "./_shared";

import styles from "./GalleryPage.module.css";

export function GalleryPage({ page }: PageLayoutProps) {
  const t = getPageStrings(page.locale);
  const officialSite = page.externalUrl?.trim();

  return (
    <PageSection rhythm="page">
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      {page.sections
        .filter((section) => {
          if (section.__component !== "sections.gallery") return true;
          return section.items.some((item) => item.image?.url);
        })
        .map((section, index) => (
          <SectionRenderer
            key={`${section.__component}-${index}`}
            section={section}
            index={index}
            galleryMode="lightbox"
          />
        ))}
      {officialSite ? (
        <div className={styles["official-site"]}>
          <ButtonLink href={officialSite} variant="secondary">
            {t.clinicOfficialSite}
          </ButtonLink>
        </div>
      ) : null}
    </PageSection>
  );
}
