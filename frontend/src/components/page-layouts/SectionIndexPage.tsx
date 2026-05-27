import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionIndexGrid } from "@/components/SectionIndexGrid";
import { deriveDirectoryTagFilter } from "@/lib/cms/directory-tags";
import { hrefForLocaleSlug } from "@/lib/cms/navigation";
import { getPageStrings } from "@/lib/i18n/page";
import { defaultAppointmentHref } from "@/lib/navigation/appointment-href";
import type { NavigationNodeDTO } from "@/lib/cms/types";
import Link from "next/link";
import { PageHeader, type PageLayoutProps } from "./_shared";
import layoutStyles from "./_shared.module.css";

type SectionIndexPageProps = PageLayoutProps & {
  currentPage?: number;
  activeTagSlug?: string | null;
  indexHref?: string;
};

export function SectionIndexPage({
  page,
  navigation = [],
  appointmentHref,
  currentPage = 1,
  activeTagSlug = null,
  indexHref,
}: SectionIndexPageProps) {
  const children =
    page.layoutVariant === "encyclopedia-index"
      ? findTaggedDirectoryPages(navigation, page.documentId)
      : findChildren(navigation, page.documentId);
  const { tags, tagMap } = deriveDirectoryTagFilter(children);
  const t = getPageStrings(page.locale);
  const bookHref = appointmentHref ?? defaultAppointmentHref(page.locale);

  return (
    <PageSection rhythm="page">
      <div className={layoutStyles["directory-page-stack"]}>
        <PageHeader page={page} kicker={null} heroImageVariant="accent" />
        {page.content ? (
          <CmsHtml html={page.content} className={layoutStyles["directory-intro"]} />
        ) : null}
        <SectionIndexGrid
          items={children}
          locale={page.locale}
          variant={page.layoutVariant}
          tags={tags}
          tagMap={tagMap}
          currentPage={currentPage}
          activeTagSlug={activeTagSlug}
          indexHref={indexHref}
          backHref={
            page.parentPage?.slug
              ? hrefForLocaleSlug(page.locale, page.parentPage.slug)
              : `/${page.locale}`
          }
        />
        <aside className={layoutStyles["directory-closure"]} aria-label={t.directoryClosureCta}>
          <p>{t.directoryClosureCopy}</p>
          <Link href={bookHref} className={layoutStyles["service-cta"]}>
            {t.directoryClosureCta}
          </Link>
        </aside>
      </div>
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

function findTaggedDirectoryPages(
  nodes: NavigationNodeDTO[],
  currentDocumentId: string,
): NavigationNodeDTO[] {
  const pages = new Map<string, NavigationNodeDTO>();

  const visit = (node: NavigationNodeDTO) => {
    if (node.documentId !== currentDocumentId && !node.isFolder && node.tags.length > 0) {
      pages.set(node.documentId, node);
    }
    node.children.forEach(visit);
  };

  nodes.forEach(visit);
  return Array.from(pages.values());
}
