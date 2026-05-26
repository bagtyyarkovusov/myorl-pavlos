"use client";

import { useState } from "react";
import type { Locale } from "@/lib/cms/types";
import { SearchFilters } from "./SearchFilters";
import styles from "./MobileFilterSheet.module.css";

type MobileFilterSheetProps = {
  sections: string[];
  locale: Locale;
  activeFilterCount: number;
};

const labels: Record<Locale, { filtersLabel: string; close: string }> = {
  el: { filtersLabel: "Φίλτρα", close: "Κλείσιμο" },
  ru: { filtersLabel: "Фильтры", close: "Закрыть" },
};

export function MobileFilterSheet({ sections, locale, activeFilterCount }: MobileFilterSheetProps) {
  const [open, setOpen] = useState(false);
  const { filtersLabel, close: closeLabel } = labels[locale];
  const countSuffix = activeFilterCount > 0 ? ` (${activeFilterCount})` : "";

  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={styles.trigger}>
        {filtersLabel}
        {countSuffix}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={filtersLabel}
          className={styles.overlay}
          onClick={() => setOpen(false)}
        >
          <div className={styles.backdrop} />
          <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
            <div className={styles.sheetHeader}>
              <h3 className={styles.sheetTitle}>{filtersLabel}</h3>
              <button type="button" onClick={() => setOpen(false)} className={styles.closeBtn}>
                {closeLabel}
              </button>
            </div>
            <SearchFilters sections={sections} locale={locale} />
          </div>
        </div>
      )}
    </>
  );
}
