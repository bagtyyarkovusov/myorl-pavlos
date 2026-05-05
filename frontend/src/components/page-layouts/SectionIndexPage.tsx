import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionIndexGrid } from "@/components/SectionIndexGrid";
import type { NavigationNodeDTO } from "@/lib/cms/types";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function SectionIndexPage({ page, navigation = [] }: PageLayoutProps) {
  const children = findChildren(navigation, page.documentId);

  return (
    <PageSection>
      <PageHeader page={page} kicker={null} />
      {page.content ? <CmsHtml html={page.content} /> : null}
      <SectionIndexGrid items={children} locale={page.locale} />
    </PageSection>
  );
}

function findChildren(
  nodes: NavigationNodeDTO[],
  documentId: string,
): NavigationNodeDTO[] {
  for (const node of nodes) {
    if (node.documentId === documentId) return node.children;
    const found = findChildren(node.children, documentId);
    if (found.length > 0) return found;
  }
  return [];
}
