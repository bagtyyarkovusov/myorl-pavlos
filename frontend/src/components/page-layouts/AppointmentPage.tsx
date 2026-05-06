import { CmsHtml } from "@/components/CmsHtml";
import { ButtonLink } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import { SectionTabBar } from "@/components/SectionTabBar";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { StructuredData } from "@/components/StructuredData";
import { buildContactPointLd } from "@/lib/structured-data/contact-point";
import { buildPageBreadcrumbLd } from "@/lib/structured-data/page-breadcrumbs";
import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

const FALLBACK_PHONE = "+302106427000";

export function AppointmentPage({ page, navigation = [] }: PageLayoutProps) {
  const breadcrumbLd = buildPageBreadcrumbLd(page);
  const contactLd = buildContactPointLd(FALLBACK_PHONE);

  return (
    <PageSection>
      {breadcrumbLd ? <StructuredData data={breadcrumbLd} /> : null}
      <StructuredData data={contactLd} />
      <PageHeader page={page} kicker="appointment" />
      <SectionTabBar navigation={navigation} currentPage={page} />
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
      {page.sections.map((section) => (
        <SectionRenderer key={section.__component} section={section} />
      ))}
    </PageSection>
  );
}
