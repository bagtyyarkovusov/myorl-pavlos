"use client";

import { useState } from "react";
import Link from "next/link";

import type { NavigationNodeDTO } from "@/lib/cms/types";
import type { TagDTO } from "@/lib/cms/types/tag";

import styles from "./SectionIndexGrid.module.css";

type SectionIndexGridProps = {
  items: NavigationNodeDTO[];
  locale: string;
  tags?: TagDTO[];
  tagMap?: Record<string, string[]>;
};

export function SectionIndexGrid({ items, locale, tags, tagMap }: SectionIndexGridProps) {
  const [activeTag, setActiveTag] = useState<string | null>(null);

  if (items.length === 0) return null;

  const sorted = [...items].sort((a, b) => a.menuIndex - b.menuIndex);

  const filtered = activeTag
    ? sorted.filter((node) => tagMap?.[node.documentId]?.includes(activeTag))
    : sorted;

  return (
    <div>
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
      <ol className={styles["index-list"]}>
        {filtered.map((node) => (
          <li key={node.documentId} className={styles["index-row"]}>
            <Link href={node.href}>
              <div className={styles["index-row__body"]}>
                <strong>{node.navLabel}</strong>
                {node.excerpt ? (
                  <p className={styles["index-row__excerpt"]}>{node.excerpt}</p>
                ) : null}
              </div>
              <span className={styles["index-row__arrow"]} aria-hidden="true">
                →
              </span>
            </Link>
          </li>
        ))}
      </ol>
    </div>
  );
}
