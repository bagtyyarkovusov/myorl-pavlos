import { stripTags } from "@/lib/html";

import type { MediaDTO } from "./types/common";
import type { NavigationNodeDTO } from "./types/page";

type DirectoryNodeWithSeo = NavigationNodeDTO & {
  seo?: {
    metaDescription?: string | null;
    ogImage?: MediaDTO | null;
  } | null;
};

export function getDirectoryNodeMedia(node: DirectoryNodeWithSeo): MediaDTO | null {
  return node.imageCenter ?? node.featuredImage ?? node.seo?.ogImage ?? null;
}

export function getDirectoryNodeDescription(node: DirectoryNodeWithSeo): string | null {
  const excerpt = stripTags(node.excerpt);
  if (excerpt) {
    return excerpt;
  }

  const metaDescription = stripTags(node.seo?.metaDescription);
  if (metaDescription) {
    return metaDescription;
  }

  return null;
}

export function getDirectoryExternalHost(node: NavigationNodeDTO): string | null {
  const href = node.externalUrl ?? (isAbsoluteHttpUrl(node.href) ? node.href : null);
  if (!href) {
    return null;
  }

  try {
    return new URL(href).hostname.replace(/^www\./i, "");
  } catch {
    return null;
  }
}

function isAbsoluteHttpUrl(value: string): boolean {
  return /^https?:\/\//i.test(value);
}
