"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import { SECTION_INDEX_FEATURED_COUNT, partitionDirectoryTags } from "@/lib/cms/directory-tags";
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
}: SectionIndexGridProps) {
  const t = getPageStrings(locale);
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const directoryVariant = getDirectoryVariant(variant);
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
  const listItems = listPool.slice(0, visibleCount);
  const hasMore = listPool.length > visibleCount;
  const remainingCount = listPool.length - visibleCount;

  const toggleTag = (slug: string) => {
    setVisibleCount(PAGE_SIZE);
    setActiveTag((current) => (current === slug ? null : slug));
  };

  const clearTagFilter = () => {
    setVisibleCount(PAGE_SIZE);
    setActiveTag(null);
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
            <button
              type="button"
              className={`${styles["filter-pill"]}${activeTag === null ? ` ${styles["filter-pill--active"]}` : ""}`}
              onClick={clearTagFilter}
              aria-pressed={activeTag === null}
            >
              {t.directoryAllFiltersLabel}
            </button>
            {primaryTags.map((tag) => (
              <FilterPill
                key={tag.slug}
                tag={tag}
                active={activeTag === tag.slug}
                onToggle={toggleTag}
              />
            ))}
          </div>
          {secondaryTags.length > 0 ? (
            <details className={styles["filter-disclosure"]}>
              <summary>{t.directoryMoreFilters}</summary>
              <div className={`${styles["filter-bar"]} ${styles["filter-bar--secondary"]}`}>
                {secondaryTags.map((tag) => (
                  <FilterPill
                    key={tag.slug}
                    tag={tag}
                    active={activeTag === tag.slug}
                    onToggle={toggleTag}
                  />
                ))}
              </div>
            </details>
          ) : null}
          {activeTag ? (
            <div className={styles["filter-status-row"]}>
              <p className={styles["filter-status"]} aria-live="polite">
                {t.directoryResultCount(filtered.length)}
              </p>
              <button type="button" className={styles["filter-clear"]} onClick={clearTagFilter}>
                {t.directoryClearFilter}
              </button>
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
        </>
      )}
    </div>
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
  const media = node.imageCenter ?? node.featuredImage;
  const hasMedia = Boolean(media?.url);

  if (variant === "directory-list") {
    return (
      <Link href={node.href} className={styles["index-row-link--directory"]}>
        <IndexMedia media={media} title={node.navLabel} variant={variant} />
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

  return (
    <Link href={node.href}>
      {variant !== "encyclopedia-list" ? (
        <IndexMedia media={media} title={node.navLabel} variant={variant} />
      ) : null}
      <div className={styles["index-row__body"]}>
        <strong>{node.navLabel}</strong>
        {node.excerpt ? <p className={styles["index-row__excerpt"]}>{node.excerpt}</p> : null}
      </div>
      {variant === "encyclopedia-list" && hasMedia ? (
        <IndexMedia media={media} title={node.navLabel} variant={variant} />
      ) : null}
      {variant === "encyclopedia-list" ? (
        <span className={styles["index-row__arrow"]} aria-hidden="true">
          →
        </span>
      ) : featuredTier ? (
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

function IndexMedia({
  media,
  title,
  variant,
}: {
  media?: MediaDTO | null;
  title: string;
  variant: DirectoryVariant;
}) {
  const isPlaceholder = !media?.url && variant === "directory-list";

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
    case "video-grid":
      return "(min-width: 768px) 50vw, 100vw";
    case "encyclopedia-list":
      return "(min-width: 768px) 160px, 33vw";
    case "directory-list":
      return "(min-width: 1024px) 33vw, 88px";
  }
}
