import { getPage } from "@/lib/cms/cms-api";
import { renderOgImage, size, contentType, alt } from "@/lib/og-image";
import { isLocale } from "@/lib/cms/types";

// Re-export the file-convention metadata Next.js looks up statically.
export { size, contentType, alt };

/**
 * Per-page Open Graph image fallback. Editors override by setting
 * `seo.ogImage` in Strapi (surfaced via `toPageMetadata.openGraph.images`);
 * when that field is empty, Next.js falls back to this file convention.
 */
export default async function OgImage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  if (!isLocale(locale)) {
    return renderOgImage({ title: "MyORL", locale: "el" });
  }

  try {
    const page = await getPage(locale, slug);
    return renderOgImage({
      title: page.title,
      description: page.seo.metaDescription,
      locale,
    });
  } catch {
    return renderOgImage({ title: "MyORL", locale });
  }
}
