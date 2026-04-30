import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

export function ContactPage({ page }: PageLayoutProps) {
  const contactSection = page.sections.find(
    (s) => s.__component === "sections.contact",
  );

  return (
    <PageSection>
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      {contactSection && contactSection.__component === "sections.contact" ? (
        <div className={styles["contact-grid"]}>
          <section className={styles["card-list"]} aria-label="Contact details">
            {contactSection.details.map((detail, index) => (
              <article className={styles["content-card"]} key={`${detail.type}-${index}`}>
                <h2>{detail.type}</h2>
                <CmsHtml html={detail.valueHtml} />
              </article>
            ))}
          </section>
          <section className={styles["card-list"]} aria-label="Clinics">
            {contactSection.clinics.map((clinic) => (
              <article className={styles["content-card"]} key={clinic.name}>
                <h2>{clinic.name}</h2>
                <CmsHtml html={clinic.addressHtml} />
                {clinic.phone ? <p>{clinic.phone}</p> : null}
                {clinic.email ? <p>{clinic.email}</p> : null}
              </article>
            ))}
          </section>
        </div>
      ) : null}
    </PageSection>
  );
}
