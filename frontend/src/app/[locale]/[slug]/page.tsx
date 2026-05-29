import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";

import { PageRenderer } from "@/components/PageRenderer";
import { getPage, getSite } from "@/lib/cms/cms-api";
import { getSitemapPages } from "@/lib/cms/cms-api";
import { isClinicChildPage, CLINIC_HUB_SLUG } from "@/lib/cms/clinic-pages";
import { toPageMetadata } from "@/lib/cms/metadata";
import { hrefForLocaleSlug } from "@/lib/cms/navigation";
import { withRelatedTopics } from "@/lib/cms/related-topics";
import { isLocale } from "@/lib/cms/types";
import { findNodeByDocumentId } from "@/lib/cms/tab-bar";

type CmsPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
};

export async function generateStaticParams() {
  try {
    const pages = await getSitemapPages();
    return pages
      .filter((p) => p.slug !== "index")
      .map((page) => ({
        locale: page.locale,
        slug: page.slug,
      }));
  } catch {
    return [];
  }
}

export const dynamicParams = true;

export const revalidate = 600;

export async function generateMetadata({ params }: CmsPageProps): Promise<Metadata> {
  const { locale, slug } = await params;
  if (!isLocale(locale)) {
    return {};
  }

  try {
    const page = await getPage(locale, slug);
    return toPageMetadata(page);
  } catch {
    return {};
  }
}

export default async function CmsPage({ params }: CmsPageProps) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const [page, { navigation, directoryNavigation, settings, appointmentHref }] = await Promise.all([
    getPage(locale, slug),
    getSite(locale),
  ]);
  const pageWithRelatedTopics = withRelatedTopics(page, directoryNavigation);

  // Clinic location slugs are legacy URLs; the hub page holds both inline blocks.
  if (isClinicChildPage(pageWithRelatedTopics)) {
    permanentRedirect(
      `${hrefForLocaleSlug(locale, CLINIC_HUB_SLUG)}#clinic-${pageWithRelatedTopics.slug}`,
    );
  }

  // Section-hub folder pages redirect to their first child.
  if (pageWithRelatedTopics.layoutVariant === "section-hub" && pageWithRelatedTopics.isFolder) {
    const self = findNodeByDocumentId(navigation, pageWithRelatedTopics.documentId);
    const firstChild = self?.children[0];
    // Stays 307 (redirect, not permanentRedirect) — the first-child target
    // changes when editors reorder children. A permanent redirect would pin
    // the cached response to a stale URL. See ADR-013.
    if (firstChild) redirect(firstChild.href);
  }

  // FIXME: Next.js 16.2.4 throws DYNAMIC_SERVER_USAGE whenever a Server
  // Component reads `await searchParams` in a page that has not opted
  // into dynamic rendering — even inside `<Suspense>`. Calling
  // `searchParams.X` here forced every slug request to 500 in production.
  // Dropping the searchParams read for now; testimonials/directory
  // pagination + tag filtering revert to defaults. Restore once the ISR
  // + dynamic-island pattern is established (see follow-up task).
  return (
    <PageRenderer
      page={pageWithRelatedTopics}
      navigation={navigation}
      directoryNavigation={directoryNavigation}
      globalSettings={settings}
      appointmentHref={appointmentHref}
      directoryHref={hrefForLocaleSlug(pageWithRelatedTopics.locale, pageWithRelatedTopics.slug)}
    />
  );
}
