"use client";

import { useState, type AnchorHTMLAttributes, type ReactNode } from "react";
import Image from "next/image";
import Link from "next/link";

import { isExternalHref } from "@/components/design-system";
import { SECTION_INDEX_FEATURED_COUNT, partitionDirectoryTags } from "@/lib/cms/directory-tags";
import {
  getDirectoryExternalHost,
  getDirectoryNodeDescription,
  getDirectoryNodeMedia,
} from "@/lib/cms/directory-node-presentation";
import type { LayoutVariant, Locale, MediaDTO, NavigationNodeDTO } from "@/lib/cms/types";
import type { TagDTO } from "@/lib/cms/types/tag";
import { getPageStrings } from "@/lib/i18n/page";

import styles from "./SectionIndexGrid.module.css";

const PAGE_SIZE = 12;

type SectionIndexGridProps = {
  items: NavigationNodeDTO[];
  locale: Locale;
  variant?: LayoutVariant;
  backHref?: string;
  tags?: TagDTO[];
  tagMap?: Record<string, string[]>;
  indexHref?: string;
  currentPage?: number;
  activeTagSlug?: string | null;
};

type DirectoryVariant =
  | "section-grid"
  | "clinic-grid"
  | "encyclopedia-list"
  | "directory-list"
  | "video-grid";

export function SectionIndexGrid({
  items,
  locale,
  variant = "encyclopedia-index",
  backHref,
  tags,
  tagMap,
  indexHref,
  currentPage = 1,
  activeTagSlug = null,
}: SectionIndexGridProps) {
  const t = getPageStrings(locale);
  const [localActiveTag, setLocalActiveTag] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const directoryVariant = getDirectoryVariant(variant);
  const usesUrlControls = directoryVariant === "encyclopedia-list" && Boolean(indexHref);
  const urlActiveTag =
    activeTagSlug && tags?.some((tag) => tag.slug === activeTagSlug) ? activeTagSlug : null;
  const activeTag = usesUrlControls ? urlActiveTag : localActiveTag;
  const tagContext = variant === "section-index" ? "section-index" : "default";
  const { primary: primaryTags, secondary: secondaryTags } = partitionDirectoryTags(
    tags ?? [],
    tagContext,
  );

  if (items.length === 0) {
    if (!backHref) return null;

    return (
      <div className={styles["empty-state"]} data-index-variant={directoryVariant}>
        <p>{t.directoryEmpty}</p>
        <Link href={backHref}>{t.backToOverview}</Link>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => a.menuIndex - b.menuIndex);

  const filtered = activeTag
    ? sorted.filter((node) => tagMap?.[node.documentId]?.includes(activeTag))
    : sorted;

  const useTieredSectionGrid =
    directoryVariant === "section-grid" &&
    !activeTag &&
    filtered.length > SECTION_INDEX_FEATURED_COUNT;

  const featuredItems = useTieredSectionGrid ? filtered.slice(0, SECTION_INDEX_FEATURED_COUNT) : [];
  const listPool = useTieredSectionGrid ? filtered.slice(SECTION_INDEX_FEATURED_COUNT) : filtered;
  const pageCount = Math.max(1, Math.ceil(listPool.length / PAGE_SIZE));
  const safeCurrentPage = usesUrlControls ? clampPage(currentPage, pageCount) : 1;
  const pageStart = usesUrlControls ? (safeCurrentPage - 1) * PAGE_SIZE : 0;
  const pageEnd = usesUrlControls ? pageStart + PAGE_SIZE : visibleCount;
  const listItems = listPool.slice(pageStart, pageEnd);
  const hasMore = !usesUrlControls && listPool.length > visibleCount;
  const remainingCount = listPool.length - visibleCount;

  const toggleTag = (slug: string) => {
    setVisibleCount(PAGE_SIZE);
    setLocalActiveTag((current) => (current === slug ? null : slug));
  };

  const clearTagFilter = () => {
    setVisibleCount(PAGE_SIZE);
    setLocalActiveTag(null);
  };

  const listVariant: DirectoryVariant =
    directoryVariant === "section-grid" ? "directory-list" : directoryVariant;

  return (
    <div data-index-variant={directoryVariant}>
      {tags && tags.length > 0 ? (
        <div className={styles["filter-shell"]}>
          <div
            className={`${styles["filter-bar"]} ${styles["filter-bar--primary"]}`}
            role="toolbar"
            aria-label={t.sections}
          >
            {usesUrlControls && indexHref ? (
              <FilterLink
                href={buildDirectoryHref(indexHref, 1, null)}
                label={t.directoryAllFiltersLabel}
                active={activeTag === null}
              />
            ) : (
              <button
                type="button"
                className={`${styles["filter-pill"]}${activeTag === null ? ` ${styles["filter-pill--active"]}` : ""}`}
                onClick={clearTagFilter}
                aria-pressed={activeTag === null}
              >
                {t.directoryAllFiltersLabel}
              </button>
            )}
            {primaryTags.map((tag) =>
              usesUrlControls && indexHref ? (
                <FilterLink
                  key={tag.slug}
                  href={buildDirectoryHref(indexHref, 1, tag.slug)}
                  label={tag.name}
                  active={activeTag === tag.slug}
                />
              ) : (
                <FilterPill
                  key={tag.slug}
                  tag={tag}
                  active={activeTag === tag.slug}
                  onToggle={toggleTag}
                />
              ),
            )}
          </div>
          {secondaryTags.length > 0 ? (
            <details className={styles["filter-disclosure"]}>
              <summary>{t.directoryMoreFilters}</summary>
              <div className={`${styles["filter-bar"]} ${styles["filter-bar--secondary"]}`}>
                {secondaryTags.map((tag) =>
                  usesUrlControls && indexHref ? (
                    <FilterLink
                      key={tag.slug}
                      href={buildDirectoryHref(indexHref, 1, tag.slug)}
                      label={tag.name}
                      active={activeTag === tag.slug}
                    />
                  ) : (
                    <FilterPill
                      key={tag.slug}
                      tag={tag}
                      active={activeTag === tag.slug}
                      onToggle={toggleTag}
                    />
                  ),
                )}
              </div>
            </details>
          ) : null}
          {activeTag ? (
            <div className={styles["filter-status-row"]}>
              <p className={styles["filter-status"]} aria-live="polite">
                {t.directoryResultCount(filtered.length)}
              </p>
              {usesUrlControls && indexHref ? (
                <Link
                  className={styles["filter-clear"]}
                  href={buildDirectoryHref(indexHref, 1, null)}
                >
                  {t.directoryClearFilter}
                </Link>
              ) : (
                <button type="button" className={styles["filter-clear"]} onClick={clearTagFilter}>
                  {t.directoryClearFilter}
                </button>
              )}
            </div>
          ) : null}
        </div>
      ) : null}
      {filtered.length === 0 ? (
        <div className={styles["empty-state"]} data-index-variant={directoryVariant}>
          <p>{t.directoryFilterEmpty}</p>
        </div>
      ) : (
        <>
          {useTieredSectionGrid ? (
            <>
              <h2 className={styles["index-section-heading"]}>{t.directoryFeaturedLabel}</h2>
              <ol
                className={`${styles["index-list"]} ${styles["index-list--section-grid"]} ${styles["index-list--featured"]}`}
              >
                {featuredItems.map((node) => (
                  <li key={node.documentId} className={styles["index-row"]}>
                    <IndexCard node={node} variant="section-grid" featuredTier />
                  </li>
                ))}
              </ol>
              <h2 className={styles["index-section-heading"]}>{t.directoryAllLabel}</h2>
            </>
          ) : null}
          <ol className={`${styles["index-list"]} ${styles[`index-list--${listVariant}`]}`}>
            {listItems.map((node) => (
              <li key={node.documentId} className={styles["index-row"]}>
                <IndexCard node={node} variant={listVariant} />
              </li>
            ))}
          </ol>
          {hasMore ? (
            <button
              type="button"
              className={styles["load-more"]}
              onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
            >
              {t.moreLabel(remainingCount)}
            </button>
          ) : null}
          {usesUrlControls && indexHref && pageCount > 1 ? (
            <Pagination
              activeTag={activeTag}
              currentPage={safeCurrentPage}
              indexHref={indexHref}
              pageCount={pageCount}
              labels={{
                first: t.paginationFirst,
                previous: t.paginationPrevious,
                next: t.paginationNext,
                last: t.paginationLast,
                nav: t.paginationLabel,
              }}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function FilterLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link
      href={href}
      className={`${styles["filter-pill"]}${active ? ` ${styles["filter-pill--active"]}` : ""}`}
      aria-current={active ? "true" : undefined}
    >
      {label}
    </Link>
  );
}

function FilterPill({
  tag,
  active,
  onToggle,
}: {
  tag: TagDTO;
  active: boolean;
  onToggle: (slug: string) => void;
}) {
  return (
    <button
      type="button"
      className={`${styles["filter-pill"]}${active ? ` ${styles["filter-pill--active"]}` : ""}`}
      onClick={() => onToggle(tag.slug)}
      aria-pressed={active}
    >
      {tag.name}
    </button>
  );
}

function IndexCard({
  node,
  variant,
  featuredTier,
}: {
  node: NavigationNodeDTO;
  variant: DirectoryVariant;
  featuredTier?: boolean;
}) {
  const media = getDirectoryNodeMedia(node);
  const description =
    getDirectoryNodeDescription(node) ??
    (variant === "clinic-grid" ? getDirectoryExternalHost(node) : null);
  const externalHost = getDirectoryExternalHost(node);
  const showMediaSlot = variant === "clinic-grid" || Boolean(media?.url);
  const hasMediaLayout = showMediaSlot;

  if (variant === "directory-list") {
    const directoryMedia = getDirectoryNodeMedia(node);
    return (
      <Link href={node.href} className={styles["index-row-link--directory"]}>
        <IndexMedia media={directoryMedia} title={node.navLabel} variant={variant} />
        <div className={styles["index-row__body"]}>
          <strong>{node.navLabel}</strong>
          {node.excerpt ? <p className={styles["index-row__excerpt"]}>{node.excerpt}</p> : null}
        </div>
        <span className={styles["index-row__arrow"]} aria-hidden="true">
          →
        </span>
      </Link>
    );
  }

  if (variant === "encyclopedia-list" || variant === "clinic-grid") {
    return (
      <IndexRowLink href={node.href} data-has-media={hasMediaLayout ? "true" : undefined}>
        {showMediaSlot ? (
          <IndexMedia media={media} title={node.navLabel} variant={variant} />
        ) : null}
        <div className={styles["index-row__body"]}>
          <strong>{node.navLabel}</strong>
          {description ? <p className={styles["index-row__excerpt"]}>{description}</p> : null}
          {variant === "clinic-grid" && externalHost && description !== externalHost ? (
            <p className={styles["index-row__site"]}>{externalHost}</p>
          ) : null}
          {variant === "encyclopedia-list" && node.tags.length > 0 ? (
            <ul className={styles["index-row__tags"]} aria-label="Article categories">
              {node.tags.map((tag) => (
                <li key={tag.slug} className={styles["index-row__tag"]}>
                  {tag.name}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </IndexRowLink>
    );
  }

  return (
    <Link href={node.href}>
      <IndexMedia media={media} title={node.navLabel} variant={variant} />
      <div className={styles["index-row__body"]}>
        <strong>{node.navLabel}</strong>
        {node.excerpt ? <p className={styles["index-row__excerpt"]}>{node.excerpt}</p> : null}
      </div>
      {featuredTier ? (
        <span
          className={`${styles["index-row__arrow"]} ${styles["index-row__arrow--featured-only"]}`}
          aria-hidden="true"
        >
          →
        </span>
      ) : null}
    </Link>
  );
}

function IndexRowLink({
  href,
  children,
  ...rest
}: {
  href: string;
  children: ReactNode;
} & AnchorHTMLAttributes<HTMLAnchorElement>) {
  if (isExternalHref(href)) {
    return (
      <a href={href} rel="noreferrer" target="_blank" {...rest}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} {...rest}>
      {children}
    </Link>
  );
}

function IndexMedia({
  media,
  title,
  variant,
}: {
  media?: MediaDTO | null;
  title: string;
  variant: DirectoryVariant;
}) {
  const isPlaceholder = !media?.url && (variant === "directory-list" || variant === "clinic-grid");

  return (
    <span
      className={styles["index-media"]}
      data-media-variant={variant}
      data-media-placeholder={isPlaceholder ? "" : undefined}
      aria-hidden={isPlaceholder ? true : undefined}
    >
      {media?.url ? (
        <Image
          src={media.url}
          alt={media.alternativeText ?? title}
          fill
          sizes={getImageSizes(variant)}
        />
      ) : null}
      {variant === "video-grid" ? (
        <span className={styles["play-overlay"]} role="img" aria-label="Play video">
          ▶
        </span>
      ) : null}
    </span>
  );
}

function getDirectoryVariant(variant: LayoutVariant): DirectoryVariant {
  switch (variant) {
    case "section-index":
      return "section-grid";
    case "clinic-index":
      return "clinic-grid";
    case "video-index":
      return "video-grid";
    case "encyclopedia-index":
    default:
      return "encyclopedia-list";
  }
}

function getImageSizes(variant: DirectoryVariant): string {
  switch (variant) {
    case "section-grid":
      return "(min-width: 1024px) 33vw, (min-width: 768px) 50vw, 100vw";
    case "clinic-grid":
    case "encyclopedia-list":
      return "(min-width: 768px) 132px, 76px";
    case "video-grid":
      return "(min-width: 768px) 50vw, 100vw";
    case "directory-list":
      return "(min-width: 1024px) 33vw, 88px";
  }
}

function Pagination({
  activeTag,
  currentPage,
  indexHref,
  labels,
  pageCount,
}: {
  activeTag: string | null;
  currentPage: number;
  indexHref: string;
  labels: {
    first: string;
    previous: string;
    next: string;
    last: string;
    nav: string;
  };
  pageCount: number;
}) {
  const previousPage = Math.max(1, currentPage - 1);
  const nextPage = Math.min(pageCount, currentPage + 1);

  return (
    <nav className={styles.pagination} aria-label={labels.nav}>
      <Link
        className={styles["pagination__control"]}
        href={buildDirectoryHref(indexHref, 1, activeTag)}
        aria-disabled={currentPage === 1 ? "true" : undefined}
      >
        {labels.first}
      </Link>
      <Link
        className={styles["pagination__control"]}
        href={buildDirectoryHref(indexHref, previousPage, activeTag)}
        aria-disabled={currentPage === 1 ? "true" : undefined}
      >
        {labels.previous}
      </Link>
      <ol className={styles["pagination__pages"]}>
        {Array.from({ length: pageCount }, (_, index) => {
          const page = index + 1;
          return (
            <li key={page}>
              <Link
                className={styles["pagination__page"]}
                href={buildDirectoryHref(indexHref, page, activeTag)}
                aria-current={page === currentPage ? "page" : undefined}
              >
                {page}
              </Link>
            </li>
          );
        })}
      </ol>
      <Link
        className={styles["pagination__control"]}
        href={buildDirectoryHref(indexHref, nextPage, activeTag)}
        aria-disabled={currentPage === pageCount ? "true" : undefined}
      >
        {labels.next}
      </Link>
      <Link
        className={styles["pagination__control"]}
        href={buildDirectoryHref(indexHref, pageCount, activeTag)}
        aria-disabled={currentPage === pageCount ? "true" : undefined}
      >
        {labels.last}
      </Link>
    </nav>
  );
}

function buildDirectoryHref(indexHref: string, page: number, tag: string | null): string {
  const params = new URLSearchParams();
  if (tag) {
    params.set("tag", tag);
  }
  if (page > 1) {
    params.set("page", String(page));
  }
  const query = params.toString();
  return query ? `${indexHref}?${query}` : indexHref;
}

function clampPage(page: number, pageCount: number): number {
  if (!Number.isFinite(page)) return 1;
  return Math.min(Math.max(1, Math.floor(page)), pageCount);
}
