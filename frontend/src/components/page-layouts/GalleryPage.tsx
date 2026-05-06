import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionTabBar } from "@/components/SectionTabBar";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { StructuredData } from "@/components/StructuredData";
import { buildPageBreadcrumbLd } from "@/lib/structured-data/page-breadcrumbs";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function GalleryPage({ page, navigation = [] }: PageLayoutProps) {
  const breadcrumbLd = buildPageBreadcrumbLd(page);

  return (
    <PageSection>
      {breadcrumbLd ? <StructuredData data={breadcrumbLd} /> : null}
      <PageHeader page={page} />
      <SectionTabBar navigation={navigation} currentPage={page} />
      <CmsHtml html={page.content} />
      {page.sections.map((section) => (
        <SectionRenderer key={section.__component} section={section} />
      ))}
    </PageSection>
  );
}
