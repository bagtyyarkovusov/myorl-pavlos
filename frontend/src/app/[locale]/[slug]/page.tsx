import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PageRenderer } from "@/components/PageRenderer";
import { getPage } from "@/lib/cms/cms-api";
import { getSitemapPages } from "@/lib/cms/cms-api";
import { toPageMetadata } from "@/lib/cms/metadata";
import { isLocale } from "@/lib/cms/types";
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

  const page = await getPage(locale, slug);
  const sp = searchParams ? await searchParams : {};
  const testimonialsPage = parsePageParam(sp.page);

  return <PageRenderer page={page} testimonialsPage={testimonialsPage} />;
}
