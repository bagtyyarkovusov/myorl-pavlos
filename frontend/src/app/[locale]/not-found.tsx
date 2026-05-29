import Link from "next/link";
import { getPageResult } from "@/lib/cms/cms-api";
import { resolveNotFoundContext } from "@/lib/routing/resolve-not-found-context";
import { isLocale, type Locale } from "@/lib/cms/types";

type NotFoundProps = {
  params?: Promise<{
    locale?: string;
    slug?: string;
  }>;
};

const localeNames: Record<Locale, string> = {
  el: "Ελληνικά",
  ru: "Русский",
};

const t = {
  el: {
    heading: "Η σελίδα δεν βρέθηκε",
    pureMessage: "Η σελίδα που αναζητάτε δεν υπάρχει.",
    crossLocaleMessage: "Αυτή η σελίδα δεν είναι διαθέσιμη στα Ελληνικά.",
    viewIn: "Δείτε την στα",
    searchPlaceholder: "Πληκτρολογήστε έναν όρο αναζήτησης",
    searchButton: "Αναζήτηση",
    homeLabel: "Αρχική",
  },
  ru: {
    heading: "Страница не найдена",
    pureMessage: "Страница, которую вы ищете, не существует.",
    crossLocaleMessage: "Эта страница недоступна на русском.",
    viewIn: "Открыть на",
    searchPlaceholder: "Введите поисковый запрос",
    searchButton: "Поиск",
    homeLabel: "Главная",
  },
} as const;

export default async function LocaleNotFound({ params }: NotFoundProps) {
  const { locale, slug } = await resolveNotFoundContext(params);

  let crossLocaleLink: { label: string; href: string } | null = null;

  if (isLocale(locale) && slug) {
    const otherLocale: Locale = locale === "el" ? "ru" : "el";
    const otherResult = await getPageResult(otherLocale, slug);
    if (otherResult.ok) {
      crossLocaleLink = {
        label: localeNames[otherLocale],
        href: `/${otherLocale}/${otherResult.page.slug}`,
      };
    }
  }

  const validLocale = isLocale(locale) ? locale : "el";
  const labels = t[validLocale];

  return (
    <>
      <meta name="robots" content="noindex" />
      <div className="page-shell">
        <header className="page-hero">
          <p className="kicker">404</p>
          <h1>{labels.heading}</h1>
          {crossLocaleLink ? (
            <>
              <p className="excerpt">{labels.crossLocaleMessage}</p>
              <p className="excerpt" style={{ marginBottom: "clamp(16px, 2.5vw, 24px)" }}>
                {labels.viewIn}{" "}
                <Link
                  href={crossLocaleLink.href}
                  style={{
                    color: "var(--accent-ink)",
                    textDecoration: "underline",
                    textUnderlineOffset: "4px",
                  }}
                >
                  {crossLocaleLink.label}
                </Link>
              </p>
            </>
          ) : (
            <p className="excerpt">{labels.pureMessage}</p>
          )}
          <SearchForm locale={validLocale} labels={labels} />
          <nav style={{ marginTop: "clamp(24px, 4vw, 36px)" }} aria-label="home pages">
            <Link
              href={`/${validLocale}`}
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "8px 18px",
                borderRadius: "var(--radius-md)",
                background: "var(--accent)",
                color: "white",
                fontWeight: 600,
                fontSize: "0.9rem",
                textDecoration: "none",
              }}
            >
              {labels.homeLabel}
            </Link>
          </nav>
        </header>
      </div>
    </>
  );
}

function SearchForm({
  locale,
  labels,
}: {
  locale: Locale;
  labels: { searchPlaceholder: string; searchButton: string };
}) {
  return (
    <form
      role="search"
      action={`/${locale}/search-results`}
      method="get"
      style={{
        display: "flex",
        gap: "8px",
        maxWidth: "480px",
        width: "100%",
        marginTop: "clamp(12px, 2.5vw, 20px)",
      }}
    >
      <input
        type="search"
        name="q"
        placeholder={labels.searchPlaceholder}
        required
        style={{
          flex: 1,
          padding: "8px 14px",
          border: "1px solid var(--line)",
          borderRadius: "var(--radius-md)",
          background: "var(--surface)",
          color: "var(--foreground)",
          fontSize: "0.95rem",
        }}
      />
      <button
        type="submit"
        style={{
          padding: "8px 18px",
          border: "none",
          borderRadius: "var(--radius-md)",
          background: "var(--accent)",
          color: "white",
          fontWeight: 600,
          fontSize: "0.9rem",
          cursor: "pointer",
        }}
      >
        {labels.searchButton}
      </button>
    </form>
  );
}
