import type { GalleryItemDTO } from "@/lib/cms/types/sections";

export type ImageObjectLd = {
  "@type": "ImageObject";
  contentUrl: string;
  caption?: string;
  width?: number;
  height?: number;
};

export function buildImageObjectLd(items: GalleryItemDTO[]): ImageObjectLd[] | null {
  const results: ImageObjectLd[] = [];

  for (const item of items) {
    if (!item.image?.url) continue;

    const entry: ImageObjectLd = {
      "@type": "ImageObject",
      contentUrl: item.image.url,
    };

    if (item.caption) entry.caption = item.caption;
    if (item.image.width) entry.width = item.image.width;
    if (item.image.height) entry.height = item.image.height;

    results.push(entry);
  }

  return results.length > 0 ? results : null;
}
