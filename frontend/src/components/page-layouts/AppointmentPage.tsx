import { CmsHtml } from "@/components/CmsHtml";
import { ButtonLink } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

export function AppointmentPage({ page }: PageLayoutProps) {
  return (
    <PageSection>
      <PageHeader page={page} kicker="appointment" />
      <CmsHtml html={page.content} />
      <section className={`${styles["content-card"]} ${styles["form-placeholder"]}`}>
        <h2>Appointment form</h2>
        <p>
          The interactive appointment form is a frontend-native module and will be wired after the
          DTO baseline.
        </p>
        <ButtonLink href={`/${page.locale}/epikoinonia`}>Use contact details →</ButtonLink>
      </section>
    </PageSection>
  );
}
