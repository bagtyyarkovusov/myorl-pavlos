"use client";

import { Meilisearch } from "meilisearch";
import type { Hit } from "meilisearch";
import { useCallback, useEffect, useRef, useState } from "react";

import type { SearchDocument } from "@/lib/search/index-document";
import type { Locale } from "@/lib/cms/types";

// indexNameForLocale inlined: el → "el", ru → "ru"
function indexNameForLocale(locale: Locale): "el" | "ru" {
  return locale;
}

import { ResultCard } from "./ResultCard";
import styles from "./SearchOverlay.module.css";

type Props = {
  locale: Locale;
  placeholder: string;
  searchLabel: string;
  isOpen: boolean;
  onClose: () => void;
};

type GroupedHits = {
  pages: Hit<SearchDocument>[];
  videos: Hit<SearchDocument>[];
  totalHits: number;
};

const SEARCH_DEBOUNCE_MS = 120;
const MIN_QUERY_LENGTH = 2;
const MAX_PER_GROUP = 5;
const MAX_TOTAL = 10;

const GROUP_LABELS: Record<Locale, { articles: string; videos: string }> = {
  el: { articles: "Άρθρα", videos: "Βίντεο" },
  ru: { articles: "Статьи", videos: "Видео" },
};

const PLACEHOLDER_MSGS: Record<Locale, string> = {
  el: "Πληκτρολογήστε τουλάχιστον 2 χαρακτήρες...",
  ru: "Введите не менее 2 символов...",
};

function noResultsMsg(locale: Locale, query: string): string {
  return locale === "el"
    ? `Δεν βρέθηκαν αποτελέσματα για "${query}"`
    : `Ничего не найдено по запросу "${query}"`;
}

function seeAllLabel(locale: Locale, count: number): string {
  return locale === "el"
    ? `Δείτε όλα τα ${count} αποτελέσματα »`
    : `Смотреть все ${count} результатов »`;
}

export function SearchOverlay({ locale, placeholder, searchLabel, isOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedHits | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientRef = useRef<InstanceType<typeof Meilisearch> | null>(null);

  // Create Meilisearch client once (lazy)
  useEffect(() => {
    if (!clientRef.current) {
      const host = process.env.NEXT_PUBLIC_MEILI_HOST;
      const apiKey = process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY;
      if (host && apiKey) {
        clientRef.current = new Meilisearch({ host, apiKey });
      }
    }
  }, []);

  // Focus input when overlay opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      inputRef.current.focus();
    }
  }, [isOpen]);

  // Close on Escape
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [isOpen, onClose]);

  // Close on backdrop click
  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: MouseEvent) => {
      if (overlayRef.current && !overlayRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener("mousedown", handler);
    }, 0);
    return () => {
      clearTimeout(timer);
      document.removeEventListener("mousedown", handler);
    };
  }, [isOpen, onClose]);

  const performSearch = useCallback(
    async (term: string) => {
      const trimmed = term.trim();
      if (trimmed.length < MIN_QUERY_LENGTH || !clientRef.current) {
        setResults(null);
        return;
      }

      setIsLoading(true);
      setError(false);
      try {
        const indexName = indexNameForLocale(locale);
        const response = await clientRef.current.index<SearchDocument>(indexName).search(trimmed, {
          limit: MAX_TOTAL,
          attributesToRetrieve: [
            "id",
            "type",
            "locale",
            "title",
            "excerpt",
            "href",
            "thumbnail",
            "parentTitle",
            "parentSlug",
            "publishedAt",
            "parentSection",
            "parentSectionLabel",
            "tags",
            "layoutVariant",
            "slug",
          ],
          attributesToHighlight: ["title", "excerpt"],
          showMatchesPosition: true,
        });

        const hits: Hit<SearchDocument>[] = response.hits ?? [];
        const pages = hits.filter((h) => h.type === "page").slice(0, MAX_PER_GROUP);
        const videos = hits.filter((h) => h.type === "video").slice(0, MAX_PER_GROUP);
        const totalHits = response.estimatedTotalHits ?? hits.length;

        setResults({ pages, videos, totalHits });
      } catch {
        setResults(null);
        setError(true);
      } finally {
        setIsLoading(false);
      }
    },
    [locale],
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setQuery(value);

      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }

      debounceTimerRef.current = setTimeout(() => {
        performSearch(value);
      }, SEARCH_DEBOUNCE_MS);
    },
    [performSearch],
  );

  // Cleanup debounce on unmount
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  if (!isOpen) return null;

  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;
  const hasResults = results && (results.pages.length > 0 || results.videos.length > 0);

  return (
    <div className={styles["backdrop"]}>
      <div
        ref={overlayRef}
        className={styles["overlay"]}
        id="search-overlay"
        role="dialog"
        aria-label={searchLabel}
      >
        <div className={styles["overlay-header"]}>
          <svg
            className={styles["search-icon"]}
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            ref={inputRef}
            type="search"
            className={styles["search-input"]}
            placeholder={placeholder}
            value={query}
            onChange={handleInputChange}
            aria-label={searchLabel}
          />
          {isLoading && <span className={styles["spinner"]} />}
        </div>

        <div
          className={`${styles["results"]} ${isLoading && results ? styles["results--loading"] : ""}`}
        >
          {!hasQuery && <p className={styles["empty-state"]}>{PLACEHOLDER_MSGS[locale]}</p>}

          {hasQuery && !hasResults && !isLoading && !error && (
            <p className={styles["empty-state"]}>{noResultsMsg(locale, query.trim())}</p>
          )}

          {error && (
            <p className={styles["error-state"]}>
              {locale === "el"
                ? "Σφάλμα αναζήτησης. Παρακαλώ δοκιμάστε ξανά."
                : "Ошибка поиска. Пожалуйста, попробуйте еще раз."}
            </p>
          )}

          {hasResults && results && (
            <>
              {results.pages.length > 0 && (
                <div className={styles["result-group"]}>
                  <h4 className={styles["result-group-title"]}>{GROUP_LABELS[locale].articles}</h4>
                  {results.pages.map((hit) => (
                    <ResultCard
                      key={hit.id}
                      title={hit._formatted?.title ?? hit.title}
                      excerpt={hit._formatted?.excerpt ?? hit.excerpt}
                      href={hit.href}
                      type={hit.type}
                      thumbnail={hit.thumbnail}
                      parentTitle={hit.parentTitle}
                      parentSlug={hit.parentSlug}
                      locale={locale}
                    />
                  ))}
                </div>
              )}

              {results.videos.length > 0 && (
                <div className={styles["result-group"]}>
                  <h4 className={styles["result-group-title"]}>{GROUP_LABELS[locale].videos}</h4>
                  {results.videos.map((hit) => (
                    <ResultCard
                      key={hit.id}
                      title={hit._formatted?.title ?? hit.title}
                      excerpt={hit._formatted?.excerpt ?? hit.excerpt}
                      href={hit.href}
                      type={hit.type}
                      thumbnail={hit.thumbnail}
                      parentTitle={hit.parentTitle}
                      parentSlug={hit.parentSlug}
                      locale={locale}
                    />
                  ))}
                </div>
              )}

              <div className={styles["footer"]}>
                <a
                  href={`/${locale}/search-results?q=${encodeURIComponent(query.trim())}`}
                  className={styles["see-all-link"]}
                >
                  {seeAllLabel(locale, results.totalHits)}
                </a>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
