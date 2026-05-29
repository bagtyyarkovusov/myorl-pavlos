import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { randomUUID } from "node:crypto";
import { isLocale } from "@/lib/cms/types";
import { getMeiliAdminClient } from "@/lib/search/meili-client";
import type { SearchDocument } from "@/lib/search/index-document";
import { resolveFallbackHref, otherLocale } from "@/lib/search/locale-fallback";
import { ResultCard } from "@/components/search/ResultCard";
import { SearchFilters } from "@/components/search/SearchFilters";
import { Pagination } from "@/components/search/Pagination";
import { SearchLocaleFallbackBanner } from "@/components/search/SearchLocaleFallbackBanner";
import { SearchResultsHero } from "@/components/search/SearchResultsHero";
import { SearchResultsError } from "@/components/search/SearchResultsError";
import { MobileFilterSheet } from "@/components/search/MobileFilterSheet";
import { logSearchQuery } from "@/lib/db";
import { UUID_RE } from "@/lib/search/session";
import { SearchResultsList } from "@/components/search/SearchResultsMotion";
import styles from "@/components/search/SearchResultsPage.module.css";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    q?: string | string[] | undefined;
    type?: string | string[] | undefined;
    sectionLabel?: string | string[] | undefined;
    sort?: string | string[] | undefined;
    page?: string | string[] | undefined;
    allLangs?: string | string[] | undefined;
    sid?: string | string[] | undefined;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: true } };
}

const t = {
  el: {
    noResults: "Δεν βρέθηκαν αποτελέσματα για",
    resultsFor: "Αποτελέσματα για",
    resultsCount: "Αποτελέσματα {{from}}–{{to}} από {{total}}",
    paginationPrev: "Προηγούμενο",
    paginationNext: "Επόμενο",
    filtersLabel: "Φίλτρα",
    tryOtherLocale: "Δοκιμάστε στα ρωσικά",
    noResultsHint: "Δοκιμάστε έναν ευρύτερο όρο ή ελέγξτε την ορθογραφία.",
    searchPlaceholder: "Πληκτρολογήστε έναν όρο αναζήτησης",
    searchButton: "Αναζήτηση",
  },
  ru: {
    noResults: "Результатов не найдено для",
    resultsFor: "Результаты для",
    resultsCount: "Результаты {{from}}–{{to}} из {{total}}",
    paginationPrev: "Назад",
    paginationNext: "Вперёд",
    filtersLabel: "Фильтры",
    tryOtherLocale: "Попробовать на греческом",
    noResultsHint: "Попробуйте более широкий термин или проверьте правописание.",
    searchPlaceholder: "Введите поисковый запрос",
    searchButton: "Поиск",
  },
} as const;

const allLangsLabel = {
  el: "Όλες οι γλώσσες",
  ru: "Все языки",
} as const;

function SearchResultsForm({ locale, q }: { locale: string; q: string }) {
  const labels = t[locale as keyof typeof t];
  return (
    <form
      role="search"
      action={`/${locale}/search-results`}
      method="get"
      className={styles.searchForm}
    >
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={labels.searchPlaceholder}
        className={styles.searchFormInput}
      />
      <button type="submit" className={styles.searchFormSubmit}>
        {labels.searchButton}
      </button>
    </form>
  );
}

export default async function SearchResultsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const sp = searchParams ? await searchParams : {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const type = typeof sp.type === "string" ? sp.type : "";
  const sectionLabel = typeof sp.sectionLabel === "string" ? sp.sectionLabel.trim() : "";
  const sort = typeof sp.sort === "string" ? sp.sort : "";
  const rawPage = parseInt(typeof sp.page === "string" ? sp.page : "1", 10);
  const page = isNaN(rawPage) || rawPage < 1 ? 1 : rawPage;
  const allLangs = sp.allLangs === "1";
  const sid = typeof sp.sid === "string" && UUID_RE.test(sp.sid) ? sp.sid : randomUUID();

  if (!q || q.length < 2) {
    return <SearchResultsHero locale={locale} />;
  }

  const validType = type === "page" || type === "video" ? type : undefined;
  const hasFilters = !!validType || !!sectionLabel;
  const activeFilterCount = (type ? 1 : 0) + (sectionLabel ? 1 : 0) + (sort ? 1 : 0);
  const resultsPerPage = 20;

  let error: { type: "unavailable" | "network" } | null = null;
  let hits: Array<SearchDocument & { _formatted?: Partial<SearchDocument>; _fallback?: boolean }> =
    [];
  let estimatedTotalHits = 0;
  let sectionOptions: string[] = [];

  try {
    const admin = getMeiliAdminClient();
    if (!admin) {
      error = { type: "unavailable" };
    } else {
      const currentIndex = admin.index<SearchDocument>(locale);

      // Build filter expressions
      const filters: string[] = [];
      if (validType) {
        filters.push(`type = ${validType}`);
      }
      if (sectionLabel) {
        filters.push(`parentSectionLabel = "${sectionLabel.replace(/"/g, '\\"')}"`);
      }

      const searchParams = {
        limit: resultsPerPage,
        offset: (page - 1) * resultsPerPage,
        filter: filters.length > 0 ? filters : undefined,
        sort: sort === "newest" ? ["publishedAt:desc"] : undefined,
        facets: ["parentSectionLabel"],
        attributesToHighlight: ["title"],
      };

      if (allLangs) {
        // Query both indexes and merge results.
        // Fetch enough from each index to cover the current page window
        // after dedup, so pagination doesn't miss cross-index overlaps.
        const other = otherLocale(locale);
        const otherIndex = admin.index<SearchDocument>(other);
        const fetchLimit = resultsPerPage * page;
        const fetchParams = {
          ...searchParams,
          limit: fetchLimit,
          offset: 0,
        };

        const [currentResult, otherResult] = await Promise.all([
          currentIndex.search(q, fetchParams),
          otherIndex.search(q, fetchParams),
        ]);

        const merged = new Map<string, SearchDocument & { _formatted?: Partial<SearchDocument> }>();
        for (const hit of currentResult.hits) {
          merged.set(hit.id, hit);
        }
        for (const hit of otherResult.hits) {
          if (!merged.has(hit.id)) {
            merged.set(hit.id, hit);
          }
        }

        const allHits = Array.from(merged.values()).sort(
          (a, b) => (b._rankBoost ?? 0) - (a._rankBoost ?? 0),
        );

        // Slice to the requested page after dedup
        const start = (page - 1) * resultsPerPage;
        hits = allHits.slice(start, start + resultsPerPage);
        // Total is bounded by what we fetched; beyond this page count,
        // further pages will naturally empty as the merged set stabilises.
        estimatedTotalHits = allHits.length;

        // Merge facet distributions from both indexes
        const mergedFacets: Record<string, Record<string, number>> = {};
        for (const result of [currentResult, otherResult]) {
          if (result.facetDistribution) {
            for (const [facetKey, distribution] of Object.entries(result.facetDistribution)) {
              if (!mergedFacets[facetKey]) {
                mergedFacets[facetKey] = { ...distribution };
              } else {
                for (const [value, count] of Object.entries(distribution)) {
                  mergedFacets[facetKey][value] = (mergedFacets[facetKey][value] ?? 0) + count;
                }
              }
            }
          }
        }
        if (mergedFacets.parentSectionLabel) {
          sectionOptions = Object.keys(mergedFacets.parentSectionLabel);
        }
      } else {
        const result = await currentIndex.search(q, searchParams);
        hits = result.hits;
        estimatedTotalHits = result.estimatedTotalHits ?? 0;

        if (result.facetDistribution?.parentSectionLabel) {
          sectionOptions = Object.keys(result.facetDistribution.parentSectionLabel);
        }

        // Fallback: if current locale returned 0 results (and no active filters),
        // query the other locale
        if (hits.length === 0 && !hasFilters) {
          const other = otherLocale(locale);
          const otherIndex = admin.index<SearchDocument>(other);
          const fallbackResult = await otherIndex.search(q, searchParams);

          if (fallbackResult.hits.length > 0) {
            hits = fallbackResult.hits.map((h) => ({ ...h, _fallback: true as const }));
            estimatedTotalHits = fallbackResult.estimatedTotalHits ?? 0;

            if (fallbackResult.facetDistribution?.parentSectionLabel) {
              sectionOptions = Object.keys(fallbackResult.facetDistribution.parentSectionLabel);
            }
          }
        }
      }
    }
  } catch (err: unknown) {
    error = { type: "network" };
    if (err instanceof Error) {
      // Transport-level errors (ECONNREFUSED, EAI_AGAIN) from Node.js DNS/TCP
      const isTransportError =
        "code" in err && typeof (err as NodeJS.ErrnoException).code === "string";

      // Meilisearch API errors carry a cause object shaped like { message, code, type, link }.
      // Duck-typed because MeiliSearchApiError is not a runtime export from meilisearch.
      const cause = (err as { cause?: unknown }).cause;
      const isMeiliApiError = typeof cause === "object" && cause !== null && "code" in cause;

      if (isTransportError || isMeiliApiError) {
        error = { type: "unavailable" };
      }
    }
  }

  if (error) {
    const retryParams = new URLSearchParams();
    if (q) retryParams.set("q", q);
    if (type) retryParams.set("type", type);
    if (sectionLabel) retryParams.set("sectionLabel", sectionLabel);
    if (sort) retryParams.set("sort", sort);
    if (page > 1) retryParams.set("page", String(page));
    const retryQs = retryParams.size > 0 ? `?${retryParams.toString()}` : "";
    return (
      <SearchResultsError
        type={error.type}
        locale={locale}
        retryPath={error.type === "network" ? `/${locale}/search-results${retryQs}` : undefined}
      />
    );
  }

  // Log the search query (fire-and-forget; tolerate DB being unreachable)
  try {
    await logSearchQuery(q, locale, estimatedTotalHits, sid);
  } catch {
    // DB unreachable or DATABASE_URL not set — degrade gracefully
  }

  // Empty results with active filters — show filters + guidance message
  if (hits.length === 0 && hasFilters) {
    return (
      <div className={styles.layout}>
        <aside className={styles.sidebar}>
          <SearchFilters sections={sectionOptions} locale={locale} />
        </aside>
        <div className={styles.main}>
          <div className={styles.mobileFilters}>
            <MobileFilterSheet
              sections={sectionOptions}
              locale={locale}
              activeFilterCount={activeFilterCount}
            />
          </div>
          <SearchResultsForm locale={locale} q={q} />
          <p className={styles.emptyTitle}>
            {t[locale].noResults} &quot;{q}&quot;
          </p>
          <p className={styles.emptyHint}>{t[locale].noResultsHint}</p>
          <a
            href={`/${locale}/search-results?q=${encodeURIComponent(q)}&allLangs=1`}
            className={styles.emptyLink}
          >
            {t[locale].tryOtherLocale}
          </a>
        </div>
      </div>
    );
  }

  // Empty results without filters — both locales returned 0
  if (hits.length === 0) {
    return (
      <div className={styles.emptyState}>
        <SearchResultsForm locale={locale} q={q} />
        <p className={styles.emptyTitle}>
          {t[locale].noResults} &quot;{q}&quot;
        </p>
        <p className={styles.emptyHint}>{t[locale].noResultsHint}</p>
        <a
          href={`/${locale}/search-results?q=${encodeURIComponent(q)}&allLangs=1`}
          className={styles.emptyLink}
        >
          {t[locale].tryOtherLocale}
        </a>
      </div>
    );
  }

  const totalPages = Math.ceil(estimatedTotalHits / resultsPerPage);
  const from = (page - 1) * resultsPerPage + 1;
  const to = Math.min(page * resultsPerPage, estimatedTotalHits);

  const resultsCountLabel = t[locale].resultsCount
    .replace("{{from}}", String(from))
    .replace("{{to}}", String(to))
    .replace("{{total}}", String(estimatedTotalHits));

  // Determine whether we're showing fallback results
  const isFallback = hits.some((h) => h._fallback === true);

  return (
    <div className={styles.layout}>
      <aside className={styles.sidebar}>
        <SearchFilters sections={sectionOptions} locale={locale} />
      </aside>

      <div className={styles.main}>
        <div className={styles.mobileFilters}>
          <MobileFilterSheet
            sections={sectionOptions}
            locale={locale}
            activeFilterCount={activeFilterCount}
          />
        </div>

        <SearchResultsForm locale={locale} q={q} />

        {(isFallback || allLangs) && (
          <SearchLocaleFallbackBanner
            locale={locale}
            allLangs={allLangs}
            resultCount={estimatedTotalHits}
          />
        )}

        <p className={styles.resultCount}>{resultsCountLabel}</p>
        <h1 className={styles.pageTitle}>
          {t[locale].resultsFor} &quot;{q}&quot;
        </h1>

        {!allLangs && (
          <p>
            <a
              href={`/${locale}/search-results?q=${encodeURIComponent(q)}&allLangs=1${type ? `&type=${type}` : ""}${sectionLabel ? `&sectionLabel=${encodeURIComponent(sectionLabel)}` : ""}${sort ? `&sort=${sort}` : ""}`}
              className={styles.allLangsLink}
            >
              {allLangsLabel[locale]}
            </a>
          </p>
        )}

        <SearchResultsList>
          {hits.map((doc) => (
            <ResultCard
              key={doc.id}
              title={doc._formatted?.title ?? doc.title}
              excerpt={doc.excerpt}
              href={doc._fallback ? resolveFallbackHref(doc, locale) : doc.href}
              type={doc.type}
              thumbnail={doc.thumbnail}
              parentTitle={doc.parentTitle}
              parentSlug={doc.parentSlug}
              locale={locale}
              localePill={isFallback || allLangs ? doc.locale : undefined}
            />
          ))}
        </SearchResultsList>

        {totalPages > 1 && (
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            prevLabel={t[locale].paginationPrev}
            nextLabel={t[locale].paginationNext}
          />
        )}
      </div>
    </div>
  );
}
