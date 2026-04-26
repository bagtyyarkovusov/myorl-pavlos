import { CmsHtml } from "@/components/CmsHtml";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function StandardPage({ page }: PageLayoutProps) {
  return (
    <main className="page-shell">
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      {page.infoBlockBottom ? (
        <CmsHtml html={page.infoBlockBottom} className="cms-html note-block" />
      ) : null}
      {page.sources ? <CmsHtml html={page.sources} className="cms-html sources-block" /> : null}
    </main>
  );
}
