import { CmsHtml } from "@/components/CmsHtml";
import { ButtonLink } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

export function AppointmentPage({ page }: PageLayoutProps) {
  return (
    <PageSection>
      <PageHeader page={page} kicker="appointment" />
      <CmsHtml html={page.content} />
      <section className={styles["content-card"]} aria-label="Contact options">
        <h2>Get in touch</h2>
        <p>Book your appointment by phone or email.</p>
        <div className="mt-6 flex flex-wrap gap-3">
          <ButtonLink href={`tel:+302101234567`} variant="primary">
            Call now
          </ButtonLink>
          <ButtonLink href={`mailto:info@clinic.example`} variant="secondary">
            Send email
          </ButtonLink>
        </div>
      </section>
      {page.sections.map((section, index) => (
        <SectionRenderer key={`${section.__component}-${index}`} section={section} index={index} />
      ))}
    </PageSection>
  );
}
