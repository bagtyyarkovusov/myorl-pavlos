import { buildAlternateUrls } from "./navigation";
import { toMediaDTO } from "./media";
import { toPageRefDTO, toTagDTO } from "./references";
import { toContactClinicDTO, toContactDetailDTO, toSemanticSections } from "./section-normalizers";
import { deriveSeoTitle, toSeoDTO } from "./seo";
import { normalizeOptionalText } from "./text";
import type { ContactClinicDTO, LayoutVariant, PageDTO, StrapiPagePayload, TagDTO } from "./types";

export function toPageDTO(page: StrapiPagePayload): PageDTO {
  const renderMode =
    page.pageType === "system" && isFrontendNativeSystemLayout(page.layoutVariant)
      ? "frontend-native"
      : "cms";
  const menuTitle = normalizeOptionalText(page.menuTitle);
  const navLabel = menuTitle ?? page.title;
  const seo = toSeoDTO(page.seo);

  return {
    documentId: page.documentId,
    locale: page.locale,
    slug: page.slug,
    title: page.title,
    menuTitle,
    navLabel,
    pageType: page.pageType,
    layoutVariant: page.layoutVariant,
    renderMode,
    seo,
    seoTitle: deriveSeoTitle(page),
    content: page.content ?? null,
    excerpt: page.excerpt ?? null,
    featuredImage: toMediaDTO(page.featuredImage),
    imageCenter: toMediaDTO(page.imageCenter),
    externalUrl: page.externalUrl ?? null,
    isFolder: Boolean(page.isFolder),
    hideFromMenu: Boolean(page.hideFromMenu),
    menuIndex: Number(page.menuIndex ?? 0),
    parentPage: toPageRefDTO(page.parentPage),
    tags: (page.tags ?? []).map(toTagDTO).filter((value): value is TagDTO => value !== null),
    infoBlockBottom: page.infoBlockBottom ?? null,
    articleAuthor: page.articleAuthor ?? null,
    sources: page.sources ?? null,
    popUpClose: page.popUpClose ?? null,
    alternateUrls: buildAlternateUrls(page),
    sections: toSemanticSections(page),
    contact: toContactDTO(page.contactSection),
  };
}

function toContactDTO(section: StrapiPagePayload["contactSection"]): PageDTO["contact"] {
  if (!section) {
    return undefined;
  }

  return {
    details: (section.details ?? []).map(toContactDetailDTO),
    clinics: (section.clinics ?? [])
      .map(toContactClinicDTO)
      .filter((value): value is ContactClinicDTO => value !== null),
  };
}

export function isFrontendNativeSystemLayout(layoutVariant: LayoutVariant): boolean {
  return (
    layoutVariant === "not-found" ||
    layoutVariant === "search-results" ||
    layoutVariant === "sitemap"
  );
}
