import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionGrid } from "@/components/SectionGrid";
import { SectionTabBar } from "@/components/SectionTabBar";
import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

export function ContactPage({ page, navigation = [] }: PageLayoutProps) {
  const contactSection = page.sections.find(
    (s) => s.__component === "sections.contact",
  );

  return (
    <PageSection>
      <PageHeader page={page} />
      <SectionTabBar navigation={navigation} currentPage={page} />
      <CmsHtml html={page.content} />
      {contactSection && contactSection.__component === "sections.contact" ? (
        <>
          <div className={styles["contact-band"]} data-contact-band>
            <SectionGrid columns={3}>
              {contactSection.details.map((detail, index) => (
                <article className={styles["content-card"]} key={`${detail.type}-${index}`}>
                  <h2>{detail.type}</h2>
                  <CmsHtml html={detail.valueHtml} />
                </article>
              ))}
            </SectionGrid>
          </div>
          {contactSection.clinics.length > 0 ? (
            <section className={styles["contact-clinics"]} aria-label="Clinics">
              <SectionGrid columns={2}>
                {contactSection.clinics.map((clinic) => (
                  <article className={styles["content-card"]} key={clinic.name}>
                    <h3>{clinic.name}</h3>
                    <CmsHtml html={clinic.addressHtml} />
                    {clinic.phone ? <p>{clinic.phone}</p> : null}
                    {clinic.email ? <p>{clinic.email}</p> : null}
                  </article>
                ))}
              </SectionGrid>
            </section>
          ) : null}
        </>
      ) : null}
    </PageSection>
  );
}
