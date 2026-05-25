"use client";

import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { useCallback } from "react";
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

export function SearchFilters({ sections, locale }: SearchFiltersProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentSection = searchParams.get("sectionLabel") ?? "";
  const currentType = searchParams.get("type") ?? "";
  const currentSort = searchParams.get("sort") ?? "";

  const navigateWithParams = useCallback(
    (key: string, value: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (value) {
        params.set(key, value);
      } else {
        params.delete(key);
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  return (
    <div>
      {/* Section filter */}
      <nav>
        <ul>
          <li>
            <button
              type="button"
              onClick={() => navigateWithParams("sectionLabel", "")}
              aria-current={!currentSection ? "page" : undefined}
            >
              {t[locale].allSections}
            </button>
          </li>
          {sections.map((section) => (
            <li key={section}>
              <button
                type="button"
                onClick={() => navigateWithParams("sectionLabel", section)}
                aria-current={currentSection === section ? "page" : undefined}
              >
                {section}
              </button>
            </li>
          ))}
        </ul>
      </nav>

      {/* Type filter */}
      <div>
        <p>{t[locale].typeLabel}</p>
        {[
          { value: "", label: t[locale].typeAll },
          { value: "page", label: t[locale].typePage },
          { value: "video", label: t[locale].typeVideo },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={currentType === option.value}
            onClick={() => navigateWithParams("type", option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Sort filter */}
      <div>
        <p>{t[locale].sortLabel}</p>
        {[
          { value: "", label: t[locale].sortRelevance },
          { value: "newest", label: t[locale].sortNewest },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={currentSort === option.value}
            onClick={() => navigateWithParams("sort", option.value)}
          >
            {option.label}
          </button>
        ))}
      </div>
    </div>
  );
}
