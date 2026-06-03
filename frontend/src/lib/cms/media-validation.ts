import type { MediaDTO } from "./types/common";
import type { NavigationNodeDTO, PageDTO } from "./types/page";

export const MAX_MEDIA_WIDTH = 4000;
export const MAX_MEDIA_HEIGHT = 3000;
export const MIN_MEDIA_WIDTH = 200;
export const MIN_MEDIA_HEIGHT = 200;

export type MediaAuditEntry = {
  documentId: string;
  slug: string;
  mediaSource: "imageCenter" | "featuredImage";
  reason: string;
  currentWidth: number | null;
  currentHeight: number | null;
  mediaUrl: string;
};

export function auditDirectoryNodeMedia(node: NavigationNodeDTO): MediaAuditEntry[] {
  const media = node.imageCenter ?? node.featuredImage;
  if (!media?.url) return [];

  return auditMedia(
    media,
    node.documentId,
    node.slug,
    node.imageCenter ? "imageCenter" : "featuredImage",
  );
}

/**
 * Audits the page-level media (imageCenter and featuredImage) on a PageDTO.
 */
export function auditPageMedia(page: PageDTO): MediaAuditEntry[] {
  const entries: MediaAuditEntry[] = [];

  if (page.imageCenter?.url) {
    entries.push(...auditMedia(page.imageCenter, page.documentId, page.slug, "imageCenter"));
  }
  if (page.featuredImage?.url) {
    entries.push(...auditMedia(page.featuredImage, page.documentId, page.slug, "featuredImage"));
  }

  return entries;
}

function auditMedia(
  media: MediaDTO,
  documentId: string,
  slug: string,
  source: MediaAuditEntry["mediaSource"],
): MediaAuditEntry[] {
  const entries: MediaAuditEntry[] = [];
  const width = media.width ?? null;
  const height = media.height ?? null;

  const makeEntry = (reason: string): MediaAuditEntry => ({
    documentId,
    slug,
    mediaSource: source,
    reason,
    currentWidth: width,
    currentHeight: height,
    mediaUrl: media.url,
  });

  if (width === null || height === null) {
    entries.push(makeEntry("missing dimensions — upload may not have been processed"));
    return entries;
  }

  if (width > MAX_MEDIA_WIDTH) {
    entries.push(makeEntry(`width ${width}px exceeds max ${MAX_MEDIA_WIDTH}px`));
  }
  if (height > MAX_MEDIA_HEIGHT) {
    entries.push(makeEntry(`height ${height}px exceeds max ${MAX_MEDIA_HEIGHT}px`));
  }
  if (width < MIN_MEDIA_WIDTH) {
    entries.push(makeEntry(`width ${width}px below min ${MIN_MEDIA_WIDTH}px`));
  }
  if (height < MIN_MEDIA_HEIGHT) {
    entries.push(makeEntry(`height ${height}px below min ${MIN_MEDIA_HEIGHT}px`));
  }

  return entries;
}
