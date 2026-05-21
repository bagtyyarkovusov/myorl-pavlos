"use client";

import { useMemo, useState } from "react";
import Link from "next/link";

import { LiteYouTube } from "@/components/video/LiteYouTube";
import { resolveVideoEntryArticleHref } from "@/lib/cms/video-entry-normalizer";
import type { Locale, VideoEntryDTO } from "@/lib/cms/types";
import { getPageStrings } from "@/lib/i18n/page";

import indexStyles from "@/components/SectionIndexGrid.module.css";
import styles from "./VideoDirectoryGrid.module.css";

type VideoDirectoryGridProps = {
  entries: VideoEntryDTO[];
  locale: Locale;
};

export function VideoDirectoryGrid({ entries, locale }: VideoDirectoryGridProps) {
  const t = getPageStrings(locale);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);

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

  if (entries.length === 0) {
    return (
      <div className={indexStyles["empty-state"]}>
        <p>{t.videoDirectoryEmpty}</p>
      </div>
    );
  }

  return (
    <div>
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
              onClick={() => setActiveCategory(null)}
              aria-pressed={activeCategory === null}
            >
              {t.directoryAllFiltersLabel}
            </button>
            {categories.map((category) => (
              <button
                key={category.slug}
                type="button"
                className={`${indexStyles["filter-pill"]}${activeCategory === category.slug ? ` ${indexStyles["filter-pill--active"]}` : ""}`}
                onClick={() =>
                  setActiveCategory((current) => (current === category.slug ? null : category.slug))
                }
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
        <ol className={styles.grid}>
          {filtered.map((entry) => {
            const articleHref = resolveVideoEntryArticleHref(entry);
            return (
              <li key={entry.documentId} className={styles.card}>
                <article>
                  <LiteYouTube
                    videoId={entry.youtubeId}
                    title={entry.title}
                    playLabel={t.videoPlayLabel}
                  />
                  <div className={styles.copy}>
                    <h2 className={styles.title}>{entry.title}</h2>
                    {entry.categories.length > 0 ? (
                      <ul className={styles.tags} aria-label={t.sections}>
                        {entry.categories.map((category) => (
                          <li key={category.slug}>{category.label}</li>
                        ))}
                      </ul>
                    ) : null}
                    {articleHref ? (
                      <Link href={articleHref} className={styles.cta}>
                        {t.videoReadMore}
                      </Link>
                    ) : null}
                  </div>
                </article>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}
