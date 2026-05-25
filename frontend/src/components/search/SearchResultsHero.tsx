import type { Locale } from "@/lib/cms/types";

const t: Record<Locale, { heading: string; placeholder: string; button: string }> = {
  el: {
    heading: "Αναζήτηση στον ιστότοπο",
    placeholder: "Πληκτρολογήστε έναν όρο αναζήτησης",
    button: "Αναζήτηση",
  },
  ru: {
    heading: "Поиск по сайту",
    placeholder: "Введите поисковый запрос",
    button: "Поиск",
  },
};

const exampleQueries = [
  "ωτορινολαρυγγολόγος",
  "rinoplastiki",
  "ЛОР",
  "septum surgery",
];

type SearchResultsHeroProps = {
  locale: Locale;
};

export function SearchResultsHero({ locale }: SearchResultsHeroProps) {
  const labels = t[locale];

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", marginBottom: "24px" }}>{labels.heading}</h1>

      <form
        role="search"
        action={`/${locale}/search-results`}
        method="get"
        style={{ marginBottom: "32px", display: "flex", gap: "8px" }}
      >
        <input
          type="search"
          name="q"
          placeholder={labels.placeholder}
          required
          style={{ padding: "8px 12px", minWidth: "280px" }}
        />
        <button type="submit" style={{ padding: "8px 16px" }}>
          {labels.button}
        </button>
      </form>

      <nav aria-label="example queries" style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center" }}>
        {exampleQueries.map((q) => (
          <a
            key={q}
            href={`/${locale}/search-results?q=${encodeURIComponent(q)}`}
            style={{
              padding: "6px 14px",
              border: "1px solid var(--line, #ddd)",
              borderRadius: "20px",
              fontSize: "0.9rem",
              color: "var(--foreground, inherit)",
              textDecoration: "none",
            }}
          >
            {q}
          </a>
        ))}
      </nav>
    </div>
  );
}
