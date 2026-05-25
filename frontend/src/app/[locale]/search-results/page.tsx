import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/cms/types";
import { getMeiliAdminClient } from "@/lib/search/meili-client";
import type { SearchDocument } from "@/lib/search/index-document";
import { ResultCard } from "@/components/search/ResultCard";
import { SearchFilters } from "@/components/search/SearchFilters";
import { Pagination } from "@/components/search/Pagination";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{
    q?: string | string[] | undefined;
    type?: string | string[] | undefined;
    sectionLabel?: string | string[] | undefined;
    sort?: string | string[] | undefined;
    page?: string | string[] | undefined;
  }>;
};

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  return { robots: { index: false, follow: true } };
}

const t = {
  el: {
    prompt: "Πληκτρολογήστε έναν όρο αναζήτησης",
    noResults: "Δεν βρέθηκαν αποτελέσματα για",
    unavailable: "Η αναζήτηση δεν είναι διαθέσιμη",
    error: "Παρουσιάστηκε σφάλμα",
    resultsFor: "Αποτελέσματα για",
    noResultsWithFilters:
      "Δεν βρέθηκαν αποτελέσματα με τα επιλεγμένα φίλτρα. Δοκιμάστε να αλλάξετε ή να αφαιρέσετε φίλτρα.",
    resultsCount: "Αποτελέσματα {{from}}–{{to}} από {{total}}",
    paginationPrev: "Προηγούμενο",
    paginationNext: "Επόμενο",
  },
  ru: {
    prompt: "Введите поисковый запрос",
    noResults: "Результатов не найдено для",
    unavailable: "Поиск временно недоступен",
    error: "Произошла ошибка",
    resultsFor: "Результаты для",
    noResultsWithFilters:
      "Результаты с выбранными фильтрами не найдены. Попробуйте изменить или убрать фильтры.",
    resultsCount: "Результаты {{from}}–{{to}} из {{total}}",
    paginationPrev: "Назад",
    paginationNext: "Вперёд",
  },
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

  if (!q) {
    return <p>{t[locale].prompt}</p>;
  }

  const validType = type === "page" || type === "video" ? type : undefined;
  const hasFilters = !!validType || !!sectionLabel;
  const resultsPerPage = 20;

  let error: string | null = null;
  let hits: Array<SearchDocument & { _formatted?: Partial<SearchDocument> }> = [];
  let estimatedTotalHits = 0;
  let sectionOptions: string[] = [];

  try {
    const admin = getMeiliAdminClient();
    if (!admin) {
      error = t[locale].unavailable;
    } else {
      const index = admin.index<SearchDocument>(locale);

      // Build filter expressions
      const filters: string[] = [];
      if (validType) {
        filters.push(`type = ${validType}`);
      }
      if (sectionLabel) {
        // Escape double-quotes inside the label value
        filters.push(`parentSectionLabel = "${sectionLabel.replace(/"/g, '\\"')}"`);
      }

      const result = await index.search(q, {
        limit: resultsPerPage,
        offset: (page - 1) * resultsPerPage,
        filter: filters.length > 0 ? filters : undefined,
        sort: sort === "newest" ? ["publishedAt:desc"] : undefined,
        facets: ["parentSectionLabel"],
        attributesToHighlight: ["title"],
      });

      hits = result.hits;
      estimatedTotalHits = result.estimatedTotalHits;

      if (result.facetDistribution?.parentSectionLabel) {
        sectionOptions = Object.keys(result.facetDistribution.parentSectionLabel);
      }
    }
  } catch {
    error = t[locale].error;
  }

  if (error) {
    return <p>{error}</p>;
  }

  // Empty results with active filters — show filters + guidance message
  if (hits.length === 0 && hasFilters) {
    return (
      <div>
        <div className="desktop-only">
          <SearchFilters sections={sectionOptions} locale={locale} />
        </div>
        <div className="mobile-only">
          <SearchFilters sections={sectionOptions} locale={locale} />
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
          <SearchFilters sections={sectionOptions} locale={locale} />
        </div>

        <p>{resultsCountLabel}</p>
        <h1>
          {t[locale].resultsFor} &quot;{q}&quot;
        </h1>

        {hits.map((doc) => (
          <ResultCard
            key={doc.id}
            title={doc._formatted?.title ?? doc.title}
            excerpt={doc.excerpt}
            href={doc.href}
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
