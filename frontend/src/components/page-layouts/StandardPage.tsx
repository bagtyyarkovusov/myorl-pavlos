import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

export function StandardPage({ page }: PageLayoutProps) {
  return (
    <PageSection>
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      {page.infoBlockBottom ? (
        <CmsHtml html={page.infoBlockBottom} className={`cms-html ${styles["note-block"]}`} />
      ) : null}
      {page.sources ? (
        <CmsHtml html={page.sources} className={`cms-html ${styles["sources-block"]}`} />
      ) : null}
    </PageSection>
  );
}
