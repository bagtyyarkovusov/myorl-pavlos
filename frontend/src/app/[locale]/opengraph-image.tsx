import { getPage } from "@/lib/cms/cms-api";
import { renderOgImage, size, contentType, alt } from "@/lib/og-image";
import { isLocale } from "@/lib/cms/types";

// Re-export the file-convention metadata Next.js looks up statically.
export { size, contentType, alt };

/**
 * Locale-home Open Graph image fallback. Renders the home page's title and
 * meta description via the shared brand-card template. Editors override by
 * setting `seo.ogImage` on the `index` page in Strapi.
 */
export default async function OgImage({ params }: { params: Promise<{ locale: string }> }) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    // Unreachable in practice — the route only matches valid locales — but
    // belt-and-suspenders so OG image generation never crashes the request.
    return renderOgImage({ title: "MyORL", locale: "el" });
  }

  try {
    const page = await getPage(locale, "index");
    return renderOgImage({
      title: page.title,
      description: page.seo.metaDescription,
      locale,
    });
  } catch {
    return renderOgImage({ title: "MyORL", locale });
  }
}
