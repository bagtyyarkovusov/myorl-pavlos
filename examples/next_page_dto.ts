export type Locale = 'el' | 'ru'

export type PageType =
  | 'home'
  | 'content'
  | 'faq'
  | 'accordion'
  | 'tabs'
  | 'gallery'
  | 'contact'
  | 'system'

export type LayoutVariant =
  | 'home'
  | 'standard'
  | 'service-article'
  | 'service-faq'
  | 'service-accordion'
  | 'service-tabs'
  | 'clinic-gallery'
  | 'office-gallery'
  | 'encyclopedia-article'
  | 'section-index'
  | 'clinic-index'
  | 'video-index'
  | 'encyclopedia-index'
  | 'appointment-form'
  | 'not-found'
  | 'search-results'
  | 'sitemap'
  | 'specialized-article'
  | 'contact'

export type SocialPlatform = 'facebook' | 'google' | 'instagram' | 'youtube'

export type RenderMode = 'cms' | 'frontend-native'

export type SeoDTO = {
  metaTitle?: string | null
  metaDescription?: string | null
}

export type MediaDTO = {
  url: string
  alternativeText?: string | null
  width?: number | null
  height?: number | null
}

export type PageRefDTO = {
  documentId: string
  slug?: string | null
  title?: string | null
}

export type TagDTO = {
  name: string
  slug: string
}

export type ContactDetailDTO = {
  type: string
  valueHtml: string
}

export type ContactClinicDTO = {
  name: string
  addressHtml: string
  phone?: string | null
  email?: string | null
}

export type SocialLinkDTO = {
  label: string
  url: string
  platform: SocialPlatform
}

export type PageDTO = {
  documentId: string
  locale: Locale
  slug: string
  title: string
  menuTitle?: string | null
  navLabel: string
  pageType: PageType
  layoutVariant: LayoutVariant
  renderMode: RenderMode
  seo: SeoDTO
  seoTitle: string
  content?: string | null
  excerpt?: string | null
  featuredImage?: MediaDTO | null
  imageCenter?: MediaDTO | null
  externalUrl?: string | null
  isFolder: boolean
  hideFromMenu: boolean
  menuIndex: number
  parentPage?: PageRefDTO | null
  tags: TagDTO[]
  infoBlockBottom?: string | null
  articleAuthor?: string | null
  sources?: string | null
  popUpClose?: string | null
  sections?: unknown[]
  contact?: {
    details: ContactDetailDTO[]
    clinics: ContactClinicDTO[]
  }
}

export type NavigationInput = Pick<
  PageDTO,
  | 'documentId'
  | 'locale'
  | 'slug'
  | 'title'
  | 'menuTitle'
  | 'navLabel'
  | 'menuIndex'
  | 'hideFromMenu'
  | 'parentPage'
  | 'externalUrl'
  | 'isFolder'
>

export type NavigationNodeDTO = NavigationInput & {
  children: NavigationNodeDTO[]
}

function compareNavigationItems(left: NavigationInput, right: NavigationInput): number {
  return (
    left.menuIndex - right.menuIndex
    || left.slug.localeCompare(right.slug)
    || left.navLabel.localeCompare(right.navLabel)
  )
}

type StrapiMedia = {
  url: string
  alternativeText?: string | null
  width?: number | null
  height?: number | null
}

type StrapiTag = {
  name?: string | null
  slug?: string | null
}

type StrapiPageRef = {
  documentId?: string | null
  slug?: string | null
  title?: string | null
}

type StrapiSocialLink = {
  name?: string | null
  url?: string | null
}

type StrapiContactDetail = {
  type?: string | null
  value?: string | null
}

type StrapiClinic = {
  name?: string | null
  address?: string | null
  phone?: string | null
  email?: string | null
  latitude?: number | null
  longitude?: number | null
}

export type StrapiPagePayload = {
  documentId: string
  locale: Locale
  slug: string
  title: string
  menuTitle?: string | null
  pageType: PageType
  layoutVariant: LayoutVariant
  seo?: SeoDTO | null
  content?: string | null
  excerpt?: string | null
  featuredImage?: StrapiMedia | null
  imageCenter?: StrapiMedia | null
  externalUrl?: string | null
  isFolder?: boolean | null
  hideFromMenu?: boolean | null
  menuIndex?: number | null
  parentPage?: StrapiPageRef | null
  tags?: StrapiTag[] | null
  infoBlockBottom?: string | null
  articleAuthor?: string | null
  sources?: string | null
  popUpClose?: string | null
  pageSections?: unknown[] | null
  faqSection?: unknown | null
  accordionSection?: unknown | null
  tabsSection?: unknown | null
  gallerySection?: unknown | null
  contactSection?: {
    details?: StrapiContactDetail[] | null
    clinics?: StrapiClinic[] | null
  } | null

  // Intentionally ignored by the DTO boundary.
  templateId?: unknown
  pageBlocks?: unknown
  relatedPages?: unknown
  childrenPages?: unknown
}

export function isFrontendNativeSystemLayout(layoutVariant: LayoutVariant): boolean {
  return layoutVariant === 'not-found' || layoutVariant === 'search-results' || layoutVariant === 'sitemap'
}

export function deriveSocialPlatform(link: StrapiSocialLink): SocialPlatform | null {
  const label = (link.name ?? '').trim().toLowerCase()
  const hostname = safeHostname(link.url)

  if (label === 'google plus' || hostname.includes('plus.google')) {
    return null
  }
  if (label === 'facebook' || hostname.includes('facebook.com')) {
    return 'facebook'
  }
  if (label === 'instagram' || hostname.includes('instagram.com')) {
    return 'instagram'
  }
  if (label === 'youtube' || hostname.includes('youtube.com') || hostname.includes('youtu.be')) {
    return 'youtube'
  }
  if (label === 'google' || hostname.includes('google.')) {
    return 'google'
  }
  return null
}

export function toSocialLinkDTO(link: StrapiSocialLink): SocialLinkDTO | null {
  const platform = deriveSocialPlatform(link)
  const label = (link.name ?? '').trim()
  const url = (link.url ?? '').trim()

  if (!platform || !label || !url) {
    return null
  }

  return {
    label,
    url,
    platform,
  }
}

export function toPageDTO(page: StrapiPagePayload): PageDTO {
  const renderMode: RenderMode =
    page.pageType === 'system' && isFrontendNativeSystemLayout(page.layoutVariant)
      ? 'frontend-native'
      : 'cms'
  const menuTitle = normalizeOptionalText(page.menuTitle)
  const navLabel = menuTitle ?? page.title
  const seoTitle = deriveSeoTitle(page)

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
    seo: page.seo ?? {},
    seoTitle,
    content: page.content ?? null,
    excerpt: page.excerpt ?? null,
    featuredImage: toMediaDTO(page.featuredImage),
    imageCenter: toMediaDTO(page.imageCenter),
    externalUrl: page.externalUrl ?? null,
    isFolder: Boolean(page.isFolder),
    hideFromMenu: Boolean(page.hideFromMenu),
    menuIndex: Number(page.menuIndex ?? 0),
    parentPage: toPageRefDTO(page.parentPage),
    tags: (page.tags ?? [])
      .map(toTagDTO)
      .filter((value): value is TagDTO => value !== null),
    infoBlockBottom: page.infoBlockBottom ?? null,
    articleAuthor: page.articleAuthor ?? null,
    sources: page.sources ?? null,
    popUpClose: page.popUpClose ?? null,
    sections: toSemanticSections(page),
    contact: toContactDTO(page.contactSection),
  }
}

export function buildNavigationTree(pages: NavigationInput[], locale: Locale): NavigationNodeDTO[] {
  const scopedPages = pages
    .filter((page) => page.locale === locale && !page.hideFromMenu)
    .sort(compareNavigationItems)

  const nodes = new Map<string, NavigationNodeDTO>()
  for (const page of scopedPages) {
    nodes.set(page.documentId, {
      ...page,
      children: [],
    })
  }

  const roots: NavigationNodeDTO[] = []
  for (const node of nodes.values()) {
    const parentDocumentId = node.parentPage?.documentId
    const parent = parentDocumentId ? nodes.get(parentDocumentId) : undefined
    if (parent) {
      parent.children.push(node)
    } else {
      roots.push(node)
    }
  }

  for (const node of nodes.values()) {
    node.children.sort(compareNavigationItems)
  }
  roots.sort(compareNavigationItems)

  return roots
}

export type PageMetadataInput = {
  title: string
  description?: string | null
  robots?: {
    index: boolean
    follow: boolean
  }
}

export function toPageMetadataInput(page: PageDTO): PageMetadataInput {
  const noIndex = page.layoutVariant === 'not-found' || page.layoutVariant === 'search-results'

  return {
    title: page.seoTitle,
    description: normalizeOptionalText(page.seo.metaDescription),
    robots: {
      index: !noIndex,
      follow: !noIndex,
    },
  }
}

export function deriveSeoTitle(page: Pick<StrapiPagePayload, 'title' | 'seo'>): string {
  return normalizeOptionalText(page.seo?.metaTitle) ?? page.title
}

function toSemanticSections(page: StrapiPagePayload): unknown[] | undefined {
  if (page.pageType === 'home') {
    return page.pageSections ?? []
  }
  if (page.pageType === 'faq') {
    return page.faqSection ? [page.faqSection] : []
  }
  if (page.pageType === 'accordion') {
    return page.accordionSection ? [page.accordionSection] : []
  }
  if (page.pageType === 'tabs') {
    return page.tabsSection ? [page.tabsSection] : []
  }
  if (page.pageType === 'gallery') {
    return page.gallerySection ? [page.gallerySection] : []
  }
  return undefined
}

function toContactDTO(
  section: StrapiPagePayload['contactSection'],
): PageDTO['contact'] {
  if (!section) {
    return undefined
  }

  return {
    details: (section.details ?? []).map((detail) => ({
      type: (detail.type ?? '').trim(),
      valueHtml: detail.value ?? '',
    })),
    clinics: (section.clinics ?? [])
      .map((clinic) => {
        const name = (clinic.name ?? '').trim()
        const addressHtml = clinic.address ?? ''
        if (!name || !addressHtml) {
          return null
        }

        // Coordinates are intentionally ignored in v1.
        return {
          name,
          addressHtml,
          phone: clinic.phone ?? null,
          email: clinic.email ?? null,
        }
      })
      .filter((value): value is ContactClinicDTO => value !== null),
  }
}

function toPageRefDTO(ref: StrapiPageRef | null | undefined): PageRefDTO | null {
  if (!ref?.documentId) {
    return null
  }

  return {
    documentId: ref.documentId,
    slug: ref.slug ?? null,
    title: ref.title ?? null,
  }
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = (value ?? '').trim()
  return normalized ? normalized : null
}

function toTagDTO(tag: StrapiTag | null | undefined): TagDTO | null {
  const name = (tag?.name ?? '').trim()
  const slug = (tag?.slug ?? '').trim()
  if (!name || !slug) {
    return null
  }

  return { name, slug }
}

function toMediaDTO(media: StrapiMedia | null | undefined): MediaDTO | null {
  if (!media?.url) {
    return null
  }

  return {
    url: media.url,
    alternativeText: media.alternativeText ?? null,
    width: media.width ?? null,
    height: media.height ?? null,
  }
}

function safeHostname(url: string | null | undefined): string {
  if (!url) {
    return ''
  }
  try {
    return new URL(url).hostname.toLowerCase()
  } catch {
    return ''
  }
}
