import { CmsHtml } from "@/components/CmsHtml";
import type { PageDTO } from "@/lib/cms/types";

type PageRendererProps = {
  page: PageDTO;
};

export function PageRenderer({ page }: PageRendererProps) {
  if (page.renderMode === "frontend-native") {
    return <FrontendNativePage page={page} />;
  }

  if (page.layoutVariant === "appointment-form") {
    return <AppointmentPage page={page} />;
  }

  if (page.pageType === "home") {
    return <HomePage page={page} />;
  }

  if (page.pageType === "faq" || page.pageType === "accordion") {
    return <QuestionListPage page={page} />;
  }

  if (page.pageType === "gallery") {
    return <GalleryPage page={page} />;
  }

  if (page.pageType === "contact") {
    return <ContactPage page={page} />;
  }

  return <StandardPage page={page} />;
}

function PageHeader({ page, kicker }: { page: PageDTO; kicker?: string }) {
  return (
    <header className="page-hero">
      <p className="kicker">{kicker ?? page.layoutVariant}</p>
      <h1>{page.title}</h1>
      {page.excerpt ? <p className="excerpt">{page.excerpt}</p> : null}
      {page.tags.length > 0 ? (
        <ul className="tag-list" aria-label="Tags">
          {page.tags.map((tag) => (
            <li key={tag.slug}>{tag.name}</li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}

function HomePage({ page }: PageRendererProps) {
  return (
    <main className="page-shell home-shell">
      <PageHeader page={page} kicker="home" />
      <CmsHtml html={page.content} />
      <SectionSummary page={page} />
    </main>
  );
}

function StandardPage({ page }: PageRendererProps) {
  return (
    <main className="page-shell">
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      <CmsHtml html={page.infoBlockBottom} className="cms-html note-block" />
      <CmsHtml html={page.sources} className="cms-html sources-block" />
    </main>
  );
}

function QuestionListPage({ page }: PageRendererProps) {
  const items = extractItems(page);

  return (
    <main className="page-shell">
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      <div className="card-list">
        {items.map((item, index) => (
          <article className="content-card" key={`${item.title}-${index}`}>
            <h2>{item.title || `Item ${index + 1}`}</h2>
            <CmsHtml html={item.html} />
          </article>
        ))}
      </div>
    </main>
  );
}

function GalleryPage({ page }: PageRendererProps) {
  const items = extractItems(page);

  return (
    <main className="page-shell">
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      <div className="gallery-grid">
        {items.map((item, index) => (
          <article className="content-card" key={`${item.title}-${index}`}>
            <h2>{item.title || item.caption || `Image ${index + 1}`}</h2>
            <CmsHtml html={item.html} />
          </article>
        ))}
      </div>
    </main>
  );
}

function ContactPage({ page }: PageRendererProps) {
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

function AppointmentPage({ page }: PageRendererProps) {
  return (
    <main className="page-shell">
      <PageHeader page={page} kicker="appointment" />
      <CmsHtml html={page.content} />
      <section className="content-card">
        <h2>Appointment form</h2>
        <p>The interactive appointment form is a frontend-native module and will be wired after the DTO baseline.</p>
      </section>
    </main>
  );
}

function FrontendNativePage({ page }: PageRendererProps) {
  if (page.layoutVariant === "search-results") {
    return (
      <main className="page-shell">
        <PageHeader page={page} kicker="search" />
        <p>Search results are rendered by the Next.js frontend and do not depend on migrated Strapi body content.</p>
      </main>
    );
  }

  if (page.layoutVariant === "sitemap") {
    return (
      <main className="page-shell">
        <PageHeader page={page} kicker="sitemap" />
        <p>
          The XML sitemap is generated by Next.js at <a href="/sitemap.xml">/sitemap.xml</a>.
        </p>
      </main>
    );
  }

  return <StandardPage page={page} />;
}

function SectionSummary({ page }: PageRendererProps) {
  const sectionCount = page.sections?.length ?? 0;

  if (sectionCount === 0) {
    return null;
  }

  return (
    <section className="content-card">
      <h2>Semantic sections</h2>
      <p>
        {sectionCount} CMS section{sectionCount === 1 ? "" : "s"} loaded through the DTO contract.
      </p>
    </section>
  );
}

function extractItems(page: PageDTO): Array<{ title?: string; caption?: string; html?: string | null }> {
  const firstSection = page.sections?.[0];
  if (!isRecord(firstSection)) {
    return [];
  }

  const rawItems = firstSection.items;
  if (!Array.isArray(rawItems)) {
    return [];
  }

  return rawItems.filter(isRecord).map((item) => ({
    title: asText(item.title ?? item.question),
    caption: asText(item.caption),
    html: asText(item.answer ?? item.content ?? item.description),
  }));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function asText(value: unknown): string | undefined {
  return typeof value === "string" ? value : undefined;
}
