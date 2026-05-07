import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionIndexGrid } from "@/components/SectionIndexGrid";
import { StructuredData } from "@/components/StructuredData";
import { hrefForLocaleSlug } from "@/lib/cms/navigation";
import { buildPageBreadcrumbLd } from "@/lib/structured-data/page-breadcrumbs";
import type { NavigationNodeDTO } from "@/lib/cms/types";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function SectionIndexPage({ page, navigation = [] }: PageLayoutProps) {
  const children = findChildren(navigation, page.documentId);
  const breadcrumbLd = buildPageBreadcrumbLd(page);

  return (
    <PageSection>
      {breadcrumbLd ? <StructuredData data={breadcrumbLd} /> : null}
      <PageHeader page={page} kicker={null} />
      {page.content ? <CmsHtml html={page.content} /> : null}
      <SectionIndexGrid
        items={children}
        locale={page.locale}
        variant={page.layoutVariant}
        backHref={
          page.parentPage?.slug
            ? hrefForLocaleSlug(page.locale, page.parentPage.slug)
            : `/${page.locale}`
        }
      />
    </PageSection>
  );
}

function findChildren(nodes: NavigationNodeDTO[], documentId: string): NavigationNodeDTO[] {
  for (const node of nodes) {
    if (node.documentId === documentId) return node.children;
    const found = findChildren(node.children, documentId);
    if (found.length > 0) return found;
  }
  return [];
}
