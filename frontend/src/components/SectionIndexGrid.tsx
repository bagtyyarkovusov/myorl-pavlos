"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";

import type { LayoutVariant, MediaDTO, NavigationNodeDTO } from "@/lib/cms/types";
import type { TagDTO } from "@/lib/cms/types/tag";

import styles from "./SectionIndexGrid.module.css";

const PAGE_SIZE = 12;

type SectionIndexGridProps = {
  items: NavigationNodeDTO[];
  locale: string;
  variant?: LayoutVariant;
  backHref?: string;
  tags?: TagDTO[];
  tagMap?: Record<string, string[]>;
};

type DirectoryVariant = "section-grid" | "clinic-grid" | "encyclopedia-list" | "video-grid";

export function SectionIndexGrid({
  items,
  variant = "encyclopedia-index",
  backHref,
  tags,
  tagMap,
}: SectionIndexGridProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const directoryVariant = getDirectoryVariant(variant);

  if (items.length === 0) {
    if (!backHref) return null;

    return (
      <div className={styles["empty-state"]} data-index-variant={directoryVariant}>
        <p>No pages are available yet.</p>
        <Link href={backHref}>Back to overview</Link>
      </div>
    );
  }

  const sorted = [...items].sort((a, b) => a.menuIndex - b.menuIndex);

  const filtered = activeTag
    ? sorted.filter((node) => tagMap?.[node.documentId]?.includes(activeTag))
    : sorted;
  const visibleItems = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;

  return (
    <div data-index-variant={directoryVariant}>
      {tags && tags.length > 0 ? (
        <div className={styles["filter-bar"]}>
          {tags.map((tag) => (
            <button
              key={tag.slug}
              type="button"
              className={`${styles["filter-pill"]}${activeTag === tag.slug ? ` ${styles["filter-pill--active"]}` : ""}`}
              onClick={() => setActiveTag(activeTag === tag.slug ? null : tag.slug)}
              aria-pressed={activeTag === tag.slug}
            >
              {tag.name}
            </button>
          ))}
        </div>
      ) : null}
      <ol className={`${styles["index-list"]} ${styles[`index-list--${directoryVariant}`]}`}>
        {visibleItems.map((node) => (
          <li key={node.documentId} className={styles["index-row"]}>
            <IndexCard node={node} variant={directoryVariant} />
          </li>
        ))}
      </ol>
      {hasMore ? (
        <button
          type="button"
          className={styles["load-more"]}
          onClick={() => setVisibleCount((count) => count + PAGE_SIZE)}
        >
          Load more
        </button>
      ) : null}
    </div>
  );
}

function IndexCard({ node, variant }: { node: NavigationNodeDTO; variant: DirectoryVariant }) {
  const media = node.imageCenter ?? node.featuredImage;

  return (
    <Link href={node.href}>
      {variant !== "encyclopedia-list" ? (
        <IndexMedia media={media} title={node.navLabel} variant={variant} />
      ) : null}
      <div className={styles["index-row__body"]}>
        <strong>{node.navLabel}</strong>
        {node.excerpt ? <p className={styles["index-row__excerpt"]}>{node.excerpt}</p> : null}
      </div>
      {variant === "encyclopedia-list" && media?.url ? (
        <IndexMedia media={media} title={node.navLabel} variant={variant} />
      ) : null}
      {variant === "encyclopedia-list" ? (
        <span className={styles["index-row__arrow"]} aria-hidden="true">
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
  return (
    <span className={styles["index-media"]} data-media-variant={variant}>
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
      return "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw";
    case "clinic-grid":
    case "video-grid":
      return "(min-width: 768px) 50vw, 100vw";
    case "encyclopedia-list":
      return "(min-width: 768px) 160px, 33vw";
  }
}
