import { CmsHtml } from "@/components/CmsHtml";
import { ContactClinicAccordion } from "@/components/contact/ContactClinicAccordion";
import { ContactForm } from "@/components/contact/ContactForm";
import { PageSection } from "@/components/PageSection";
import { buildContactRenderModel } from "@/lib/contact/contact-render-model";
import { resolveContactSection } from "@/lib/contact/contact-section-fallbacks";
import { getContactStrings } from "@/lib/i18n/contact";
import type { GlobalSettingsDTO, PageDTO } from "@/lib/cms/types";
import { PageHeader } from "./_shared";
import styles from "./ContactPage.module.css";

type ContactPageProps = {
  page: PageDTO;
};

export function ContactPage({ page }: ContactPageProps) {
  const t = getContactStrings(page.locale);
  const contactSection = resolveContactSection(page, page.locale);
  const model = buildContactRenderModel(contactSection);
  const mapSrc = model.map?.src ?? null;

  return (
    <PageSection>
      <PageHeader page={page} kicker="contact" showExcerpt={false} showHeroImage={false} />
      <CmsHtml html={page.content} />

      <ContactForm locale={page.locale} />

      <div className={styles.split} data-contact-split>
        <aside className={styles.column} aria-label={t.contactDetailsLabel}>
          {model.section.details.length > 0 ? (
            <section className={styles.detailsBand} aria-label={t.contactDetailsLabel}>
              {model.section.details.map((detail, index) => (
                <article className={styles.detailCard} key={`${detail.type}-${index}`}>
                  <h2>{detail.type}</h2>
                  <CmsHtml html={detail.valueHtml} />
                </article>
              ))}
            </section>
          ) : null}
          {model.clinics.length > 0 ? (
            <ContactClinicAccordion clinics={model.clinics} toggleLabel={t.clinicsLabel} />
          ) : null}
        </aside>

        {mapSrc ? (
          <section className={styles.mapColumn} aria-label={t.mapLabel}>
            <iframe
              data-contact-map
              src={mapSrc}
              title={t.mapLabel}
              loading="lazy"
              referrerPolicy="no-referrer-when-downgrade"
              className={styles.mapFrame}
            />
          </section>
        ) : null}
      </div>
    </PageSection>
  );
}
