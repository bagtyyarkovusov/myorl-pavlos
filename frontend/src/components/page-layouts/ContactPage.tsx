import { CmsHtml } from "@/components/CmsHtml";
import { ContactClinicAccordion } from "@/components/contact/ContactClinicAccordion";
import { PageSection } from "@/components/PageSection";
import { SectionTabBar } from "@/components/SectionTabBar";
import { mapEmbedSrcFromAddress } from "@/lib/site/contact-fallbacks";
import type { GlobalSettingsDTO, NavigationNodeDTO, PageDTO } from "@/lib/cms/types";
import { PageHeader } from "./_shared";
import styles from "./ContactPage.module.css";

type ContactPageProps = {
  page: PageDTO;
  navigation?: NavigationNodeDTO[];
  /**
   * Optional global Strapi settings. The contact map iframe `src` is derived
   * from `globalSettings.address` once on mount and never re-renders on
   * clinic selection (PRD #103 blocker-fix decision).
   */
  globalSettings?: GlobalSettingsDTO | null;
};

export function ContactPage({ page, navigation = [], globalSettings }: ContactPageProps) {
  const contactSection = page.sections.find((s) => s.__component === "sections.contact");
  const detailsBlock =
    contactSection?.__component === "sections.contact" ? contactSection.details : [];
  const clinics = contactSection?.__component === "sections.contact" ? contactSection.clinics : [];

  const trimmedAddress = globalSettings?.address?.trim() ?? "";
  const mapSrc = trimmedAddress ? mapEmbedSrcFromAddress(trimmedAddress) : null;

  return (
    <PageSection>
      <PageHeader page={page} />
      <SectionTabBar navigation={navigation} currentPage={page} />
      <CmsHtml html={page.content} />

      <div className={styles.split} data-contact-split>
        <aside className={styles.column} aria-label="Contact details">
          {detailsBlock.length > 0 ? (
            <section className={styles.detailsBand} aria-label="Contact information">
              {detailsBlock.map((detail, index) => (
                <article className={styles.detailCard} key={`${detail.type}-${index}`}>
                  <h2>{detail.type}</h2>
                  <CmsHtml html={detail.valueHtml} />
                </article>
              ))}
            </section>
          ) : null}
          {clinics.length > 0 ? (
            <ContactClinicAccordion clinics={clinics} toggleLabel="Clinics" />
          ) : null}
        </aside>

        {mapSrc ? (
          <section className={styles.mapColumn} aria-label="Map">
            <iframe
              data-contact-map
              src={mapSrc}
              title="Map"
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
