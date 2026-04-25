import { CmsHtml } from "@/components/CmsHtml";
import type { SectionDTO } from "@/lib/cms/types";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function GalleryPage({ page }: PageLayoutProps) {
  const items = extractGalleryItems(page.sections);

  return (
    <main className="page-shell">
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      <div className="gallery-grid">
        {items.map((item, index) => (
          <article className="content-card" key={`${item.caption ?? "image"}-${index}`}>
            <h2>{item.caption || `Image ${index + 1}`}</h2>
            {item.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={item.imageUrl} alt={item.alt ?? item.caption ?? ""} />
            ) : null}
          </article>
        ))}
      </div>
    </main>
  );
}

function extractGalleryItems(
  sections: SectionDTO[],
): Array<{ caption: string | null; imageUrl: string | null; alt: string | null }> {
  const first = sections.find((section) => section.__component === "sections.gallery");
  if (!first || first.__component !== "sections.gallery") {
    return [];
  }
  return first.items.map((item) => ({
    caption: item.caption ?? null,
    imageUrl: item.image?.url ?? null,
    alt: item.image?.alternativeText ?? null,
  }));
}
