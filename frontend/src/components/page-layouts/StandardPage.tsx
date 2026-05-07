import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionTabBar } from "@/components/SectionTabBar";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { StructuredData } from "@/components/StructuredData";
import { buildPageBreadcrumbLd } from "@/lib/structured-data/page-breadcrumbs";
import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

export function StandardPage({ page, navigation = [] }: PageLayoutProps) {
  const breadcrumbLd = buildPageBreadcrumbLd(page);

  return (
    <PageSection>
      {breadcrumbLd ? <StructuredData data={breadcrumbLd} /> : null}
      <PageHeader page={page} />
      <SectionTabBar navigation={navigation} currentPage={page} />
      <CmsHtml html={page.content} />
      {page.sections.map((section, index) => (
        <SectionRenderer key={`${section.__component}-${index}`} section={section} index={index} />
      ))}
      {page.infoBlockBottom ? (
        <CmsHtml html={page.infoBlockBottom} className={`cms-html ${styles["note-block"]}`} />
      ) : null}
      {page.sources ? (
        <CmsHtml html={page.sources} className={`cms-html ${styles["sources-block"]}`} />
      ) : null}
    </PageSection>
  );
}
