import { CmsHtml } from "@/components/CmsHtml";
import { ContactClinicAccordion } from "@/components/contact/ContactClinicAccordion";
import { ContactForm } from "@/components/contact/ContactForm";
import { PageSection } from "@/components/PageSection";
import { buildContactRenderModel } from "@/lib/contact/contact-render-model";
import { getContactStrings } from "@/lib/i18n/contact";
import type { PageDTO, SectionDTO } from "@/lib/cms/types";
import { PageHeader } from "./_shared";
import styles from "./ContactPage.module.css";

type ContactPageProps = {
  page: PageDTO;
};

type ContactSection = Extract<SectionDTO, { __component: "sections.contact" }>;

function getContactSection(page: PageDTO): ContactSection | null {
  const section = page.sections.find((entry) => entry.__component === "sections.contact");
  return section?.__component === "sections.contact" ? section : null;
}

export function ContactPage({ page }: ContactPageProps) {
  const t = getContactStrings(page.locale);
  const contactSection = getContactSection(page);
  const model = contactSection ? buildContactRenderModel(contactSection) : null;
  const mapSrc = model?.map?.src ?? null;

  return (
    <PageSection rhythm="page">
      <PageHeader page={page} kicker="contact" showExcerpt={false} showHeroImage={false} />
      <CmsHtml html={page.content} />

      <ContactForm locale={page.locale} />

      {model ? (
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
      ) : null}
    </PageSection>
  );
}
