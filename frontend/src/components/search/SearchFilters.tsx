"use client";

import { useSearchParams, usePathname } from "next/navigation";
import type { Locale } from "@/lib/cms/types";

export type SearchFiltersProps = {
  sections: string[];
  locale: Locale;
};

const t: Record<Locale, Record<string, string>> = {
  el: {
    allSections: "Όλες οι ενότητες",
    typeLabel: "Τύπος",
    typeAll: "Όλα",
    typePage: "Άρθρα",
    typeVideo: "Βίντεο",
    sortLabel: "Ταξινόμηση",
    sortRelevance: "Συνάφεια",
    sortNewest: "Νεότερα",
  },
  ru: {
    allSections: "Все разделы",
    typeLabel: "Тип",
    typeAll: "Все",
    typePage: "Статьи",
    typeVideo: "Видео",
    sortLabel: "Сортировка",
    sortRelevance: "Релевантность",
    sortNewest: "Новые",
  },
};

function buildFilterUrl(
  key: string,
  value: string,
  currentParams: URLSearchParams,
  pathname: string,
): string {
  const params = new URLSearchParams(currentParams.toString());
  if (value) {
    params.set(key, value);
  } else {
    params.delete(key);
  }
  params.set("page", "1");
  return `${pathname}?${params.toString()}`;
}

export function SearchFilters({ sections, locale }: SearchFiltersProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const currentSection = searchParams.get("sectionLabel") ?? "";
  const currentType = searchParams.get("type") ?? "";
  const currentSort = searchParams.get("sort") ?? "";

  return (
    <div>
      {/* Section filter */}
      <nav>
        <ul>
          <li>
            <a
              href={buildFilterUrl("sectionLabel", "", searchParams, pathname)}
              aria-current={!currentSection ? "page" : undefined}
            >
              {t[locale].allSections}
            </a>
          </li>
          {sections.map((section) => (
            <li key={section}>
              <a
                href={buildFilterUrl("sectionLabel", section, searchParams, pathname)}
                aria-current={currentSection === section ? "page" : undefined}
              >
                {section}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {/* Type filter */}
      <section>
        <h3>{t[locale].typeLabel}</h3>
        {[
          { value: "", label: t[locale].typeAll },
          { value: "page", label: t[locale].typePage },
          { value: "video", label: t[locale].typeVideo },
        ].map((option) => (
          <a
            key={option.value}
            href={buildFilterUrl("type", option.value, searchParams, pathname)}
            aria-current={currentType === option.value ? "page" : undefined}
          >
            {option.label}
          </a>
        ))}
      </section>

      {/* Sort filter */}
      <section>
        <h3>{t[locale].sortLabel}</h3>
        {[
          { value: "", label: t[locale].sortRelevance },
          { value: "newest", label: t[locale].sortNewest },
        ].map((option) => (
          <a
            key={option.value}
            href={buildFilterUrl("sort", option.value, searchParams, pathname)}
            aria-current={currentSort === option.value ? "page" : undefined}
          >
            {option.label}
          </a>
        ))}
      </section>
    </div>
  );
}
