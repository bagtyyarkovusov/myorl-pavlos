import type { Metadata } from "next";
import { notFound, permanentRedirect, redirect } from "next/navigation";
import { Suspense } from "react";

import { PageRenderer } from "@/components/PageRenderer";
import { getPage, getSite } from "@/lib/cms/cms-api";
import { getSitemapPages } from "@/lib/cms/cms-api";
import { isClinicChildPage, CLINIC_HUB_SLUG } from "@/lib/cms/clinic-pages";
import { toPageMetadata } from "@/lib/cms/metadata";
import { hrefForLocaleSlug } from "@/lib/cms/navigation";
import { withRelatedTopics } from "@/lib/cms/related-topics";
import {
  isLocale,
  type PageDTO,
  type NavigationNodeDTO,
  type GlobalSettingsDTO,
} from "@/lib/cms/types";
import { findNodeByDocumentId } from "@/lib/cms/tab-bar";
import { parsePageParam } from "@/lib/testimonials/paginate";

type CmsPageProps = {
  params: Promise<{
    locale: string;
    slug: string;
  }>;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
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

// FIXME: Next 16.2.4 throws DYNAMIC_SERVER_USAGE when a page exports
// `revalidate = N` and also reads `await searchParams` (even inside a
// Suspense boundary). All slug pages 500 in production until this is
// resolved. Falling back to fully-dynamic rendering until the proper
// ISR + searchParams pattern is established. Tracked separately.
export const dynamic = "force-dynamic";

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

export default async function CmsPage({ params, searchParams }: CmsPageProps) {
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

  return (
    <Suspense fallback={null}>
      <CmsPageContent
        page={pageWithRelatedTopics}
        navigation={navigation}
        directoryNavigation={directoryNavigation}
        globalSettings={settings}
        appointmentHref={appointmentHref}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function CmsPageContent({
  page,
  navigation,
  directoryNavigation,
  globalSettings,
  appointmentHref,
  searchParams,
}: {
  page: PageDTO;
  navigation: NavigationNodeDTO[];
  directoryNavigation: NavigationNodeDTO[];
  globalSettings?: GlobalSettingsDTO;
  appointmentHref: string;
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const testimonialsPage = parsePageParam(sp.page);
  const directoryPage = parsePageParam(sp.page);
  const directoryTag = parseTagParam(sp.tag);

  return (
    <PageRenderer
      page={page}
      navigation={navigation}
      directoryNavigation={directoryNavigation}
      globalSettings={globalSettings}
      appointmentHref={appointmentHref}
      testimonialsPage={testimonialsPage}
      directoryPage={directoryPage}
      directoryTag={directoryTag}
      directoryHref={hrefForLocaleSlug(page.locale, page.slug)}
    />
  );
}

function parseTagParam(raw: string | string[] | undefined): string | null {
  const value = Array.isArray(raw) ? raw[0] : raw;
  return value && value.trim().length > 0 ? value : null;
}
