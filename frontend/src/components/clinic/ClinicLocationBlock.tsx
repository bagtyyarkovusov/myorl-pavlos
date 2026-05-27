import { ClinicGalleryStrip } from "@/components/clinic/ClinicGalleryStrip";
import { CmsHtml } from "@/components/CmsHtml";
import { ButtonLink } from "@/components/design-system";
import { getGallerySection } from "@/lib/cms/clinic-pages";
import type { PageDTO } from "@/lib/cms/types";
import { getPageStrings } from "@/lib/i18n/page";
import { defaultAppointmentHref } from "@/lib/navigation/appointment-href";

import styles from "./ClinicLocationBlock.module.css";

type ClinicLocationBlockProps = {
  page: PageDTO;
  appointmentHref?: string;
  showTitle?: boolean;
  headingLevel?: "h2" | "h3";
};

export function ClinicLocationBlock({
  page,
  appointmentHref,
  showTitle = true,
  headingLevel = "h2",
}: ClinicLocationBlockProps) {
  const t = getPageStrings(page.locale);
  const gallery = getGallerySection(page);
  const bookHref = appointmentHref ?? defaultAppointmentHref(page.locale);
  const HeadingTag = headingLevel;

  return (
    <section
      id={`clinic-${page.slug}`}
      className={styles.block}
      aria-labelledby={showTitle ? `clinic-${page.slug}-title` : undefined}
    >
      {showTitle ? (
        <div className={styles.header}>
          <HeadingTag id={`clinic-${page.slug}-title`} className={styles.title}>
            {page.title}
          </HeadingTag>
          <span className={styles.rule} aria-hidden="true" />
        </div>
      ) : null}

      {gallery?.items?.length ? (
        <ClinicGalleryStrip items={gallery.items} locale={page.locale} />
      ) : null}

      {page.content ? (
        <CmsHtml className={`cms-html ${styles.prose}`} html={page.content} />
      ) : null}

      <div className={styles.actions}>
        <ButtonLink href={bookHref}>{t.clinicBookOnline}</ButtonLink>
      </div>
    </section>
  );
}
