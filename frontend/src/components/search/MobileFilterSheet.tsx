"use client";

import { useState } from "react";
import type { Locale } from "@/lib/cms/types";
import { SearchFilters } from "./SearchFilters";

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
  const l = labels[locale];
  const countSuffix = activeFilterCount > 0 ? ` (${activeFilterCount})` : "";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{
          padding: "6px 14px",
          border: "1px solid var(--line, #ddd)",
          borderRadius: "20px",
          fontSize: "0.9rem",
          background: "var(--surface, #fff)",
          cursor: "pointer",
          marginBottom: "16px",
        }}
      >
        {l.filtersLabel}
        {countSuffix}
      </button>

      {open && (
        <div
          role="dialog"
          aria-label={l.filtersLabel}
          onClick={() => setOpen(false)}
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 40,
            display: "flex",
            alignItems: "flex-end",
            justifyContent: "center",
          }}
        >
          {/* Backdrop */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundColor: "rgba(0,0,0,0.4)",
            }}
          />

          {/* Sheet */}
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              width: "100%",
              maxWidth: 600,
              maxHeight: "80vh",
              overflowY: "auto",
              backgroundColor: "var(--surface, #fff)",
              borderTopLeftRadius: "16px",
              borderTopRightRadius: "16px",
              padding: "20px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ margin: 0, fontSize: "1.1rem" }}>{l.filtersLabel}</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                style={{
                  padding: "4px 10px",
                  border: "1px solid var(--line, #ddd)",
                  borderRadius: "6px",
                  background: "var(--surface, #fff)",
                  cursor: "pointer",
                  fontSize: "0.85rem",
                }}
              >
                {l.close}
              </button>
            </div>
            <SearchFilters sections={sections} locale={locale} />
          </div>
        </div>
      )}
    </>
  );
}
