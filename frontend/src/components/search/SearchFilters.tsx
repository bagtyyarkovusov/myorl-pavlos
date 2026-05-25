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
  },
  ru: {
    allSections: "Все разделы",
  },
};

export function SearchFilters({ sections, locale }: SearchFiltersProps) {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const currentSection = searchParams.get("sectionLabel") ?? "";

  const setSection = useCallback(
    (section: string) => {
      const params = new URLSearchParams(searchParams.toString());
      if (section) {
        params.set("sectionLabel", section);
      } else {
        params.delete("sectionLabel");
      }
      params.set("page", "1");
      router.push(`${pathname}?${params.toString()}`);
    },
    [searchParams, pathname, router],
  );

  return (
    <nav>
      <ul>
        <li>
          <button
            type="button"
            onClick={() => setSection("")}
            aria-current={!currentSection ? "page" : undefined}
          >
            {t[locale].allSections}
          </button>
        </li>
        {sections.map((section) => (
          <li key={section}>
            <button
              type="button"
              onClick={() => setSection(section)}
              aria-current={currentSection === section ? "page" : undefined}
            >
              {section}
            </button>
          </li>
        ))}
      </ul>
    </nav>
  );
}
