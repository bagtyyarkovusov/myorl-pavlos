import { CmsHtml } from "@/components/CmsHtml";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function StandardPage({ page }: PageLayoutProps) {
  return (
    <main className="page-shell">
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      <CmsHtml html={page.infoBlockBottom} className="cms-html note-block" />
      <CmsHtml html={page.sources} className="cms-html sources-block" />
    </main>
  );
}
