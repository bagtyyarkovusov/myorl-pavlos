import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { isLocale } from "@/lib/cms/types";
import { getMeiliAdminClient } from "@/lib/search/meili-client";
import type { SearchDocument } from "@/lib/search/index-document";
import { ResultCard } from "@/components/search/ResultCard";

type Props = {
  params: Promise<{ locale: string }>;
  searchParams?: Promise<{ q?: string | string[] | undefined }>;
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
  },
  ru: {
    prompt: "Введите поисковый запрос",
    noResults: "Результатов не найдено для",
    unavailable: "Поиск временно недоступен",
    error: "Произошла ошибка",
    resultsFor: "Результаты для",
  },
} as const;

export default async function SearchResultsPage({ params, searchParams }: Props) {
  const { locale } = await params;
  if (!isLocale(locale)) notFound();

  const sp = searchParams ? await searchParams : {};
  const q = typeof sp.q === "string" ? sp.q.trim() : "";

  if (!q) {
    return <p>{t[locale].prompt}</p>;
  }

  let error: string | null = null;
  let hits: Array<SearchDocument & { _formatted?: Partial<SearchDocument> }> = [];

  try {
    const admin = getMeiliAdminClient();
    if (!admin) {
      error = t[locale].unavailable;
    } else {
      const index = admin.index<SearchDocument>(locale);
      const result = await index.search(q, {
        limit: 20,
        attributesToHighlight: ["title"],
      });
      hits = result.hits;
    }
  } catch {
    error = t[locale].error;
  }

  if (error) {
    return <p>{error}</p>;
  }

  if (hits.length === 0) {
    return (
      <p>
        {t[locale].noResults} &quot;{q}&quot;
      </p>
    );
  }

  return (
    <div>
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
    </div>
  );
}
