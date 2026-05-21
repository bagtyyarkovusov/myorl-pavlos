"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { LiteYouTube } from "@/components/video/LiteYouTube";
import { resolveVideoEntryArticleHref } from "@/lib/cms/video-entry-normalizer";
import type { Locale, VideoEntryDTO } from "@/lib/cms/types";
import { getPageStrings } from "@/lib/i18n/page";

import indexStyles from "@/components/SectionIndexGrid.module.css";
import styles from "./VideoDirectoryGrid.module.css";

const PAGE_SIZE = 12;

type VideoDirectoryGridProps = {
  entries: VideoEntryDTO[];
  locale: Locale;
};

export function VideoDirectoryGrid({ entries, locale }: VideoDirectoryGridProps) {
  const t = getPageStrings(locale);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
  const [expandedEntryId, setExpandedEntryId] = useState<string | null>(null);

  const categories = useMemo(() => {
    const map = new Map<string, string>();
    for (const entry of entries) {
      for (const category of entry.categories) {
        map.set(category.slug, category.label);
      }
    }
    return Array.from(map.entries())
      .map(([slug, label]) => ({ slug, label }))
      .sort((a, b) => a.label.localeCompare(b.label, locale));
  }, [entries, locale]);

  const filtered = activeCategory
    ? entries.filter((entry) =>
        entry.categories.some((category) => category.slug === activeCategory),
      )
    : entries;

  const visibleEntries = filtered.slice(0, visibleCount);
  const hasMore = filtered.length > visibleCount;
  const remainingCount = filtered.length - visibleCount;

  const clearCategory = () => {
    setVisibleCount(PAGE_SIZE);
    setExpandedEntryId(null);
    setActiveCategory(null);
  };

  const toggleCategory = (slug: string) => {
    setVisibleCount(PAGE_SIZE);
    setExpandedEntryId(null);
    setActiveCategory((current) => (current === slug ? null : slug));
  };

  if (entries.length === 0) {
    return (
      <div className={indexStyles["empty-state"]}>
        <p>{t.videoDirectoryEmpty}</p>
      </div>
    );
  }

  return (
    <div className={styles.root} data-video-directory>
      {categories.length > 0 ? (
        <div className={indexStyles["filter-shell"]}>
          <div
            className={`${indexStyles["filter-bar"]} ${indexStyles["filter-bar--primary"]}`}
            role="toolbar"
            aria-label={t.sections}
          >
            <button
              type="button"
              className={`${indexStyles["filter-pill"]}${activeCategory === null ? ` ${indexStyles["filter-pill--active"]}` : ""}`}
              onClick={clearCategory}
              aria-pressed={activeCategory === null}
            >
              {t.directoryAllFiltersLabel}
            </button>
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                className={`${indexStyles["filter-pill"]}${activeCategory === category.slug ? ` ${indexStyles["filter-pill--active"]}` : ""}`}
                onClick={() => toggleCategory(category.slug)}
                aria-pressed={activeCategory === category.slug}
              >
                {category.label}
              </button>
            ))}
          </div>
          {activeCategory ? (
            <p className={indexStyles["filter-status"]} aria-live="polite">
              {t.directoryResultCount(filtered.length)}
            </p>
          ) : null}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <div className={indexStyles["empty-state"]}>
          <p>{t.directoryFilterEmpty}</p>
        </div>
      ) : (
        <>
          <ol className={styles.list}>
            {visibleEntries.map((entry) => {
              const articleHref = resolveVideoEntryArticleHref(entry);
              const isExpanded = expandedEntryId === entry.documentId;
              return (
                <li
                  key={entry.documentId}
                  className={`${styles.item}${isExpanded ? ` ${styles["item--expanded"]}` : ""}`}
                >
                  <article
                    className={`${styles.itemArticle}${isExpanded ? ` ${styles["itemArticle--expanded"]}` : ""}`}
                  >
                    <div className={styles.itemMain}>
                      <div className={styles.media}>
                        <LiteYouTube
                          videoId={entry.youtubeId}
                          title={entry.title}
                          playLabel={`${t.videoPlayLabel}: ${entry.title}`}
                          variant={isExpanded ? "full" : "compact"}
                          activated={isExpanded}
                          onActivate={() => setExpandedEntryId(entry.documentId)}
                        />
                      </div>
                      <div className={styles.copy}>
                        <h2 className={styles.title}>{entry.title}</h2>
                        {entry.categories.length > 0 ? (
                          <ul className={styles.tags} aria-label={t.sections}>
                            {entry.categories.map((category) => (
                              <li key={category.slug}>{category.label}</li>
                            ))}
                          </ul>
                        ) : null}
                        {isExpanded && articleHref ? (
                          <Link href={articleHref} className={styles.cta}>
                            {t.videoReadMore}
                          </Link>
                        ) : null}
                      </div>
                    </div>
                  </article>
                </li>
              );
            })}
          </ol>
          {hasMore ? (
            <button
              type="button"
              className={indexStyles["load-more"]}
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
