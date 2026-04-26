import { normalizeOptionalText } from "./text";
import type { PageRefDTO, StrapiPageRef, StrapiTag, TagDTO } from "./types";

export function toPageRefDTO(ref: StrapiPageRef | null | undefined): PageRefDTO | null {
  if (!ref?.documentId) {
    return null;
  }

  return {
    documentId: ref.documentId,
    slug: ref.slug ?? null,
    title: ref.title ?? null,
  };
}

export function toTagDTO(tag: StrapiTag | null | undefined): TagDTO | null {
  const name = normalizeOptionalText(tag?.name);
  const slug = normalizeOptionalText(tag?.slug);
  if (!name || !slug) {
    return null;
  }

  return { name, slug };
}
