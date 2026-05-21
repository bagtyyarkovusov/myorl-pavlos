import { hrefForLocaleSlug } from "./navigation";
import { normalizeOptionalText, toPageRefDTO } from "./page-normalizer";
import type { VideoCategoryDTO, VideoEntryDTO, StrapiVideoEntryPayload } from "./types";

function slugifyCategory(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\u0370-\u03ff\u0400-\u04ff]+/gi, "-")
    .replace(/^-+|-+$/g, "");
}

function toVideoCategories(value: unknown): VideoCategoryDTO[] {
  if (!Array.isArray(value)) return [];

  const seen = new Set<string>();
  const categories: VideoCategoryDTO[] = [];

  for (const item of value) {
    const label =
      typeof item === "string"
        ? normalizeOptionalText(item)
        : typeof item === "object" && item !== null && "label" in item
          ? normalizeOptionalText(String((item as { label?: unknown }).label))
          : null;
    if (!label) continue;

    const slug = slugifyCategory(label) || "category";
    if (seen.has(slug)) continue;
    seen.add(slug);
    categories.push({ slug, label });
  }

  return categories;
}

/**
 * Resolves the href readers should use for a video entry's related article button.
 */
export function resolveVideoEntryArticleHref(
  entry: Pick<VideoEntryDTO, "locale" | "relatedArticle" | "legacyArticleUrl">,
): string | null {
  if (entry.relatedArticle?.slug) {
    return hrefForLocaleSlug(entry.locale, entry.relatedArticle.slug);
  }

  const legacy = normalizeOptionalText(entry.legacyArticleUrl);
  if (!legacy || legacy === "#" || legacy.endsWith("/#") || legacy.endsWith("#")) {
    return null;
  }

  try {
    const url = new URL(legacy, "https://myorl.gr");
    const path = url.pathname.replace(/\/$/, "");
    if (!path || path === "/") return null;

    const segments = path.split("/").filter(Boolean);
    const slug = segments.at(-1);
    if (!slug) return null;

    return hrefForLocaleSlug(entry.locale, decodeURIComponent(slug));
  } catch {
    return null;
  }
}

export function toVideoEntryDTO(raw: StrapiVideoEntryPayload): VideoEntryDTO {
  return {
    documentId: raw.documentId,
    locale: raw.locale,
    title: raw.title,
    youtubeId: raw.youtubeId.trim(),
    youtubeUrl: normalizeOptionalText(raw.youtubeUrl),
    categories: toVideoCategories(raw.categories),
    sortOrder: Number(raw.sortOrder ?? 0),
    relatedArticle: toPageRefDTO(raw.relatedArticle ?? null),
    legacyArticleUrl: normalizeOptionalText(raw.legacyArticleUrl),
  };
}
