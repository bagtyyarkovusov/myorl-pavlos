import { CmsHtml } from "@/components/CmsHtml";
import { ButtonLink } from "@/components/design-system";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function AppointmentPage({ page }: PageLayoutProps) {
  return (
    <main className="page-shell">
      <PageHeader page={page} kicker="appointment" />
      <CmsHtml html={page.content} />
      <section className="content-card form-placeholder">
        <h2>Appointment form</h2>
        <p>
          The interactive appointment form is a frontend-native module and will be wired after the
          DTO baseline.
        </p>
        <ButtonLink href={`/${page.locale}/epikoinonia`}>Use contact details →</ButtonLink>
      </section>
    </main>
  );
}
