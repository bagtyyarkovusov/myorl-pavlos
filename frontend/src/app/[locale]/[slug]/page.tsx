import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";

import { PageRenderer } from "@/components/PageRenderer";
import { getPage, getSite } from "@/lib/cms/cms-api";
import { getSitemapPages } from "@/lib/cms/cms-api";
import { toPageMetadata } from "@/lib/cms/metadata";
import { isLocale, type PageDTO, type NavigationNodeDTO } from "@/lib/cms/types";
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

  const [page, { navigation, directoryNavigation }] = await Promise.all([
    getPage(locale, slug),
    getSite(locale),
  ]);

  // Section-hub folder pages redirect to their first child.
  if (page.layoutVariant === "section-hub" && page.isFolder) {
    const self = findNodeByDocumentId(navigation, page.documentId);
    const firstChild = self?.children[0];
    if (firstChild) redirect(firstChild.href);
  }

  return (
    <Suspense
      fallback={
        <PageRenderer
          page={page}
          navigation={navigation}
          directoryNavigation={directoryNavigation}
          testimonialsPage={1}
        />
      }
    >
      <CmsPageContent
        page={page}
        navigation={navigation}
        directoryNavigation={directoryNavigation}
        searchParams={searchParams}
      />
    </Suspense>
  );
}

async function CmsPageContent({
  page,
  navigation,
  directoryNavigation,
  searchParams,
}: {
  page: PageDTO;
  navigation: NavigationNodeDTO[];
  directoryNavigation: NavigationNodeDTO[];
  searchParams?: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = searchParams ? await searchParams : {};
  const testimonialsPage = parsePageParam(sp.page);

  return (
    <PageRenderer
      page={page}
      navigation={navigation}
      directoryNavigation={directoryNavigation}
      testimonialsPage={testimonialsPage}
    />
  );
}
