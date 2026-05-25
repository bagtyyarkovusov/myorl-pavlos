import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/cms/types";
import { getMeiliAdminClient } from "@/lib/search/meili-client";
import type { SearchDocument } from "@/lib/search/index-document";
import { resolveFallbackHref, otherLocale } from "@/lib/search/locale-fallback";
import { ResultCard } from "@/components/search/ResultCard";
import { SearchFilters } from "@/components/search/SearchFilters";
import { Pagination } from "@/components/search/Pagination";
import { SearchLocaleFallbackBanner } from "@/components/search/SearchLocaleFallbackBanner";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    q?: string | string[] | undefined;
    type?: string | string[] | undefined;
    sectionLabel?: string | string[] | undefined;
    sort?: string | string[] | undefined;
    page?: string | string[] | undefined;
    allLangs?: string | string[] | undefined;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: true } };
}

const t = {
  el: {
    prompt: "Πληκτρολογήστε έναν όρο αναζήτησης",
    searchLabel: "Αναζήτηση",
    searchButton: "Αναζήτηση",
    noResults: "Δεν βρέθηκαν αποτελέσματα για",
    unavailable: "Η αναζήτηση δεν είναι διαθέσιμη",
    error: "Παρουσιάστηκε σφάλμα",
    resultsFor: "Αποτελέσματα για",
    noResultsWithFilters:
      "Δεν βρέθηκαν αποτελέσματα με τα επιλεγμένα φίλτρα. Δοκιμάστε να αλλάξετε ή να αφαιρέσετε φίλτρα.",
    resultsCount: "Αποτελέσματα {{from}}–{{to}} από {{total}}",
    paginationPrev: "Προηγούμενο",
    paginationNext: "Επόμενο",
    filtersLabel: "Φίλτρα",
  },
  ru: {
    prompt: "Введите поисковый запрос",
    searchLabel: "Поиск",
    searchButton: "Поиск",
    noResults: "Результатов не найдено для",
    unavailable: "Поиск временно недоступен",
    error: "Произошла ошибка",
    resultsFor: "Результаты для",
    noResultsWithFilters:
      "Результаты с выбранными фильтрами не найдены. Попробуйте изменить или убрать фильтры.",
    resultsCount: "Результаты {{from}}–{{to}} из {{total}}",
    paginationPrev: "Назад",
    paginationNext: "Вперёд",
    filtersLabel: "Фильтры",
  },
} as const;

const allLangsLabel = {
  el: "Όλες οι γλώσσες",
  ru: "Все языки",
} as const;

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

  if (!q) {
    return (
      <form action={`/${locale}/search-results`} method="get">
        <label htmlFor="search-input">{t[locale].searchLabel}</label>
        <input id="search-input" type="search" name="q" required />
        <button type="submit">{t[locale].searchButton}</button>
      </form>
    );
  }

  const validType = type === "page" || type === "video" ? type : undefined;
  const hasFilters = !!validType || !!sectionLabel;
  const resultsPerPage = 20;

  let error: string | null = null;
  let hits: Array<SearchDocument & { _formatted?: Partial<SearchDocument>; _fallback?: boolean }> =
    [];
  let estimatedTotalHits = 0;
  let sectionOptions: string[] = [];

  try {
    const admin = getMeiliAdminClient();
    if (!admin) {
      error = t[locale].unavailable;
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
  } catch {
    error = t[locale].error;
  }

  if (error) {
    return <p role="alert">{error}</p>;
  }

  // Empty results with active filters — show filters + guidance message
  if (hits.length === 0 && hasFilters) {
    return (
      <div>
        <div className="desktop-only">
          <SearchFilters sections={sectionOptions} locale={locale} />
        </div>
        <div className="mobile-only">
          <details style={{ marginBottom: "16px" }} open>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              {t[locale].filtersLabel || "Filters"}
            </summary>
            <SearchFilters sections={sectionOptions} locale={locale} />
          </details>
        </div>
        <p>{t[locale].noResultsWithFilters}</p>
      </div>
    );
  }

  // Empty results without filters — show original no-results message
  if (hits.length === 0) {
    return (
      <p>
        {t[locale].noResults} &quot;{q}&quot;
      </p>
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
    <div style={{ display: "flex", gap: "2rem" }}>
      {/* Desktop sidebar */}
      <aside className="desktop-only" style={{ width: 280, flexShrink: 0 }}>
        <SearchFilters sections={sectionOptions} locale={locale} />
      </aside>

      {/* Main results area */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {/* Mobile collapsible filters */}
        <div className="mobile-only">
          <details style={{ marginBottom: "16px" }} open={!!(type || sectionLabel || sort)}>
            <summary style={{ cursor: "pointer", fontWeight: 600 }}>
              {t[locale].filtersLabel || "Filters"}
            </summary>
            <SearchFilters sections={sectionOptions} locale={locale} />
          </details>
        </div>

        {(isFallback || allLangs) && (
          <SearchLocaleFallbackBanner locale={locale} allLangs={allLangs} />
        )}

        <p>{resultsCountLabel}</p>
        <h1>
          {t[locale].resultsFor} &quot;{q}&quot;
        </h1>

        {!allLangs && (
          <p>
            <a
              href={`/${locale}/search-results?q=${encodeURIComponent(q)}&allLangs=1${type ? `&type=${type}` : ""}${sectionLabel ? `&sectionLabel=${encodeURIComponent(sectionLabel)}` : ""}${sort ? `&sort=${sort}` : ""}`}
              style={{ fontSize: "0.85em" }}
            >
              {allLangsLabel[locale]}
            </a>
          </p>
        )}

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
          />
        ))}

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
