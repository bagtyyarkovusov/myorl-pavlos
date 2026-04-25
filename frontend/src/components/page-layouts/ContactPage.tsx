import { CmsHtml } from "@/components/CmsHtml";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function ContactPage({ page }: PageLayoutProps) {
  return (
    <main className="page-shell">
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      {page.contact ? (
        <>
          <section className="card-list" aria-label="Contact details">
            {page.contact.details.map((detail, index) => (
              <article className="content-card" key={`${detail.type}-${index}`}>
                <h2>{detail.type}</h2>
                <CmsHtml html={detail.valueHtml} />
              </article>
            ))}
          </section>
          <section className="card-list" aria-label="Clinics">
            {page.contact.clinics.map((clinic) => (
              <article className="content-card" key={clinic.name}>
                <h2>{clinic.name}</h2>
                <CmsHtml html={clinic.addressHtml} />
                {clinic.phone ? <p>{clinic.phone}</p> : null}
                {clinic.email ? <p>{clinic.email}</p> : null}
              </article>
            ))}
          </section>
        </>
      ) : null}
    </main>
  );
}
