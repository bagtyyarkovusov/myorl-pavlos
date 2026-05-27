"use client";

import { Meilisearch } from "meilisearch";
import type { Hit } from "meilisearch";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { useFocusTrap } from "@/lib/hooks/useFocusTrap";

import type { SearchDocument } from "@/lib/search/index-document";
import { getSessionId } from "@/lib/search/session";
import type { Locale } from "@/lib/cms/types";
import { otherLocale } from "@/lib/search/locale-fallback";

import { ResultCard } from "./ResultCard";
import { SearchLocaleFallbackBanner } from "./SearchLocaleFallbackBanner";
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
  pageFacetCount: number;
  videoFacetCount: number;
};

type TypeFilter = "all" | "page" | "video";

const SEARCH_DEBOUNCE_MS = 120;
const MIN_QUERY_LENGTH = 2;
const MAX_PER_GROUP = 3;
const MAX_TOTAL = 10;

const GROUP_LABELS: Record<Locale, { articles: string; videos: string }> = {
  el: { articles: "Άρθρα", videos: "Βίντεο" },
  ru: { articles: "Статьи", videos: "Видео" },
};

const FILTER_LABELS: Record<Locale, Record<TypeFilter, string>> = {
  el: { all: "Όλα", page: "Άρθρα", video: "Βίντεο" },
  ru: { all: "Все", page: "Статьи", video: "Видео" },
};

const CLOSE_LABELS: Record<Locale, string> = {
  el: "Κλείσιμο",
  ru: "Закрыть",
};

const NOT_CONFIGURED_MSGS: Record<Locale, string> = {
  el: "Η αναζήτηση δεν έχει ρυθμιστεί",
  ru: "Поиск не настроен",
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

function seeAllFooterLabel(locale: Locale, count: number, query: string): string {
  return locale === "el"
    ? `→ Δείτε όλα τα ${count} αποτελέσματα για "${query}" »`
    : `→ Смотреть все ${count} результатов для "${query}" »`;
}

function seeAllGroupLabel(locale: Locale, count: number, groupLabel: string): string {
  return locale === "el"
    ? `→ Δείτε όλα τα ${count} αποτελέσματα στα ${groupLabel} »`
    : `→ Смотреть все ${count} результатов в ${groupLabel} »`;
}

function resultCountAnnouncement(locale: Locale, count: number): string {
  return locale === "el" ? `${count} αποτελέσματα βρέθηκαν` : `Найдено ${count} результатов`;
}

function buildSearchParams() {
  return {
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
    facets: ["type"],
  };
}

function groupHits(
  hits: Hit<SearchDocument>[],
  facetDistribution?: Record<string, Record<string, number>>,
): GroupedHits {
  const pages = hits.filter((h) => h.type === "page").slice(0, MAX_PER_GROUP);
  const videos = hits.filter((h) => h.type === "video").slice(0, MAX_PER_GROUP);
  const pageFacetCount = facetDistribution?.type?.page ?? pages.length;
  const videoFacetCount = facetDistribution?.type?.video ?? videos.length;
  return {
    pages,
    videos,
    totalHits: pageFacetCount + videoFacetCount || hits.length,
    pageFacetCount,
    videoFacetCount,
  };
}

const ERROR_MSGS: Record<Locale, string> = {
  el: "Σφάλμα αναζήτησης. Παρακαλώ δοκιμάστε ξανά.",
  ru: "Ошибка поиска. Пожалуйста, попробуйте еще раз.",
};

export function SearchOverlay({ locale, placeholder, searchLabel, isOpen, onClose }: Props) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<GroupedHits | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(false);
  const [fallbackLocale, setFallbackLocale] = useState<Locale | null>(null);
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const [prevIsOpen, setPrevIsOpen] = useState(isOpen);
  const inputRef = useRef<HTMLInputElement>(null);
  const overlayRef = useRef<HTMLDivElement>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const clientRef = useRef<InstanceType<typeof Meilisearch> | null>(null);

  // Reset state when `isOpen` transitions to true. Adjusting state during
  // render (React's recommended pattern for prop-driven resets) avoids the
  // cascading render that a setState-in-effect would cause.
  if (isOpen !== prevIsOpen) {
    setPrevIsOpen(isOpen);
    if (isOpen) {
      setQuery("");
      setResults(null);
      setIsLoading(false);
      setError(false);
      setFallbackLocale(null);
      setTypeFilter("all");
      setSelectedIndex(-1);
    }
  }

  useFocusTrap(overlayRef, isOpen);

  // Create Meilisearch client once (lazy)
  useEffect(() => {
    if (!clientRef.current) {
      const host = process.env.NEXT_PUBLIC_MEILI_HOST;
      const apiKey = process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY;
      if (host && apiKey) {
        clientRef.current = new Meilisearch({ host, apiKey });
      } else {
        console.warn(
          "SearchOverlay: NEXT_PUBLIC_MEILI_HOST or NEXT_PUBLIC_MEILI_SEARCH_KEY is missing. Search will not work.",
        );
      }
    }
  }, []);

  // Focus the search input when the overlay opens. Kept separate from the
  // state-reset block above because focus is a DOM side effect.
  useEffect(() => {
    if (isOpen) {
      inputRef.current?.focus();
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
        setFallbackLocale(null);
        return;
      }

      setIsLoading(true);
      setError(false);
      setFallbackLocale(null);
      setSelectedIndex(-1);

      try {
        const response = await clientRef.current
          .index<SearchDocument>(locale)
          .search(trimmed, buildSearchParams());

        const hits: Hit<SearchDocument>[] = response.hits ?? [];

        let totalHits = 0;

        if (hits.length === 0) {
          // Try fallback locale
          const fallback = otherLocale(locale);
          const fallbackResponse = await clientRef.current
            .index<SearchDocument>(fallback)
            .search(trimmed, buildSearchParams());

          const fallbackHits: Hit<SearchDocument>[] = fallbackResponse.hits ?? [];
          if (fallbackHits.length > 0) {
            setResults(
              groupHits(
                fallbackHits,
                fallbackResponse.facetDistribution as
                  | Record<string, Record<string, number>>
                  | undefined,
              ),
            );
            setFallbackLocale(fallback);
            totalHits = fallbackResponse.estimatedTotalHits ?? fallbackHits.length;
          } else {
            setResults(null);
          }
        } else {
          setResults(
            groupHits(
              hits,
              response.facetDistribution as Record<string, Record<string, number>> | undefined,
            ),
          );
          totalHits = response.estimatedTotalHits ?? hits.length;
        }

        // Fire-and-forget search query log
        const sessionId = getSessionId();
        if (sessionId) {
          fetch("/api/search/log", {
            method: "POST",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({
              query: trimmed,
              locale,
              result_count: totalHits,
              session_id: sessionId,
            }),
          }).catch(() => {});
        }
      } catch {
        setResults(null);
        setError(true);
        setFallbackLocale(null);
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

  const visibleResults = useMemo(() => {
    if (query.trim().length < MIN_QUERY_LENGTH || !results) return [];

    const items: Array<{ href: string }> = [];
    if (typeFilter !== "video") {
      items.push(...results.pages.map((p) => ({ href: p.href })));
    }
    if (typeFilter !== "page") {
      items.push(...results.videos.map((v) => ({ href: v.href })));
    }
    return items;
  }, [query, results, typeFilter]);

  const handleOverlayKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (visibleResults.length === 0) return;

      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((i) => {
            if (i === -1) return 0;
            return (i + 1) % visibleResults.length;
          });
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((i) => {
            if (i === -1) return visibleResults.length - 1;
            return (i - 1 + visibleResults.length) % visibleResults.length;
          });
          break;
        case "Enter":
          if (selectedIndex >= 0 && selectedIndex < visibleResults.length) {
            e.preventDefault();
            const href = visibleResults[selectedIndex]?.href;
            if (href) window.location.assign(href);
          }
          break;
      }
    },
    [visibleResults, selectedIndex],
  );

  if (!isOpen) return null;
  if (process.env.NEXT_PUBLIC_SEARCH_ENABLED === "false") return null;

  const isMisconfigured =
    !process.env.NEXT_PUBLIC_MEILI_HOST || !process.env.NEXT_PUBLIC_MEILI_SEARCH_KEY;

  const sessionId = getSessionId();
  const hasQuery = query.trim().length >= MIN_QUERY_LENGTH;
  const hasResults = results && (results.pages.length > 0 || results.videos.length > 0);
  const seeAllHref = `/${locale}/search-results?q=${encodeURIComponent(query.trim())}${
    sessionId ? `&sid=${sessionId}` : ""
  }`;

  const filteredPages = typeFilter === "video" ? [] : (results?.pages ?? []);
  const filteredVideos = typeFilter === "page" ? [] : (results?.videos ?? []);
  const hasFilteredResults = filteredPages.length > 0 || filteredVideos.length > 0;

  const resultLocale = fallbackLocale ?? locale;

  return (
    <div className={styles["backdrop"]}>
      <div
        ref={overlayRef}
        className={styles["overlay"]}
        id="search-overlay"
        role="dialog"
        aria-modal="true"
        aria-label={searchLabel}
        onKeyDown={handleOverlayKeyDown}
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
            role="combobox"
            aria-label={searchLabel}
            aria-expanded={hasResults ? "true" : "false"}
            aria-haspopup="listbox"
            aria-controls="search-results-listbox"
            aria-autocomplete="list"
            aria-activedescendant={
              selectedIndex >= 0 ? `search-result-${selectedIndex}` : undefined
            }
          />
          <kbd className={styles["shortcut-hint"]} aria-hidden="true">
            /
          </kbd>
          {isLoading && <span className={styles["spinner"]} />}
          <button
            type="button"
            className={styles["close-btn"]}
            aria-label={CLOSE_LABELS[locale]}
            onClick={onClose}
          >
            <svg
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              aria-hidden="true"
            >
              <path d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {!isMisconfigured && hasQuery && (
          <div className={styles["filter-pills"]}>
            {(["all", "page", "video"] as TypeFilter[]).map((filter) => (
              <button
                key={filter}
                type="button"
                className={`${styles["filter-pill"]} ${typeFilter === filter ? styles["filter-pill--active"] : ""}`}
                aria-label={FILTER_LABELS[locale][filter]}
                aria-pressed={typeFilter === filter}
                onClick={() => {
                  setTypeFilter(filter);
                  setSelectedIndex(-1);
                }}
              >
                {FILTER_LABELS[locale][filter]}
              </button>
            ))}
          </div>
        )}

        <div
          className={`${styles["results"]} ${isLoading && results ? styles["results--loading"] : ""}`}
          role={hasResults ? "listbox" : undefined}
          id={hasResults ? "search-results-listbox" : undefined}
        >
          {isMisconfigured ? (
            <p className={styles["error-state"]} role="alert">
              {NOT_CONFIGURED_MSGS[locale]}
            </p>
          ) : (
            <>
              {!hasQuery && <p className={styles["empty-state"]}>{PLACEHOLDER_MSGS[locale]}</p>}

              {hasQuery && !hasResults && !isLoading && !error && (
                <p className={styles["empty-state"]}>{noResultsMsg(locale, query.trim())}</p>
              )}

              {error && (
                <p className={styles["error-state"]} role="alert">
                  {ERROR_MSGS[locale]}
                </p>
              )}
            </>
          )}

          {/* aria-live result count announcer — always in DOM so SR picks up changes */}
          <div className={styles["sr-only"]} role="status" aria-live="polite" aria-atomic="true">
            {hasResults && results ? resultCountAnnouncement(locale, results.totalHits) : ""}
          </div>

          {hasResults && results && (
            <>
              {fallbackLocale && (
                <div className={styles["fallback-banner"]}>
                  <SearchLocaleFallbackBanner locale={locale} />
                </div>
              )}

              {filteredPages.length > 0 && (
                <div className={styles["result-group"]}>
                  <h4 className={styles["result-group-title"]}>{GROUP_LABELS[locale].articles}</h4>
                  {filteredPages.map((hit, i) => (
                    <div
                      key={hit.id}
                      id={`search-result-${i}`}
                      role="option"
                      aria-selected={selectedIndex === i}
                    >
                      <ResultCard
                        title={hit._formatted?.title ?? hit.title}
                        excerpt={hit._formatted?.excerpt ?? hit.excerpt}
                        href={hit.href}
                        type={hit.type}
                        thumbnail={null}
                        parentTitle={hit.parentTitle}
                        parentSlug={hit.parentSlug}
                        locale={resultLocale}
                        localePill={fallbackLocale ? hit.locale : undefined}
                      />
                    </div>
                  ))}
                  {results.pageFacetCount > MAX_PER_GROUP && typeFilter !== "video" && (
                    <a
                      href={`/${locale}/search-results?q=${encodeURIComponent(query.trim())}&type=page`}
                      className={styles["group-see-all"]}
                    >
                      {seeAllGroupLabel(
                        locale,
                        results.pageFacetCount,
                        GROUP_LABELS[locale].articles,
                      )}
                    </a>
                  )}
                </div>
              )}

              {filteredVideos.length > 0 && (
                <div className={styles["result-group"]}>
                  <h4 className={styles["result-group-title"]}>{GROUP_LABELS[locale].videos}</h4>
                  {filteredVideos.map((hit, i) => {
                    const globalIndex = filteredPages.length + i;
                    return (
                      <div
                        key={hit.id}
                        id={`search-result-${globalIndex}`}
                        role="option"
                        aria-selected={selectedIndex === globalIndex}
                      >
                        <ResultCard
                          title={hit._formatted?.title ?? hit.title}
                          excerpt={hit._formatted?.excerpt ?? hit.excerpt}
                          href={hit.href}
                          type={hit.type}
                          thumbnail={hit.thumbnail}
                          parentTitle={hit.parentTitle}
                          parentSlug={hit.parentSlug}
                          locale={resultLocale}
                          localePill={fallbackLocale ? hit.locale : undefined}
                        />
                      </div>
                    );
                  })}
                  {results.videoFacetCount > MAX_PER_GROUP && typeFilter !== "page" && (
                    <a
                      href={`/${locale}/search-results?q=${encodeURIComponent(query.trim())}&type=video`}
                      className={styles["group-see-all"]}
                    >
                      {seeAllGroupLabel(
                        locale,
                        results.videoFacetCount,
                        GROUP_LABELS[locale].videos,
                      )}
                    </a>
                  )}
                </div>
              )}
            </>
          )}
        </div>

        {hasFilteredResults && results && (
          <div className={styles["footer"]}>
            <a href={seeAllHref} className={styles["see-all-link"]}>
              {seeAllFooterLabel(locale, results.totalHits, query.trim())}
            </a>
          </div>
        )}
      </div>
    </div>
  );
}
