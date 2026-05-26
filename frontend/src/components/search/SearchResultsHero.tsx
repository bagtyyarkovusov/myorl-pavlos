import type { Locale } from "@/lib/cms/types";
import styles from "./SearchResultsHero.module.css";

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

const exampleQueries = ["ωτορινολαρυγγολόγος", "rinoplastiki", "ЛОР", "septum surgery"];

type SearchResultsHeroProps = {
  locale: Locale;
};

export function SearchResultsHero({ locale }: SearchResultsHeroProps) {
  const labels = t[locale];

  return (
    <div className={styles.hero}>
      <h1 className={styles.heading}>{labels.heading}</h1>

      <form role="search" action={`/${locale}/search-results`} method="get" className={styles.form}>
        <input
          type="search"
          name="q"
          placeholder={labels.placeholder}
          required
          className={styles.input}
        />
        <button type="submit" className={styles.submit}>
          {labels.button}
        </button>
      </form>

      <nav aria-label="example queries" className={styles.examples}>
        {exampleQueries.map((q) => (
          <a
            key={q}
            href={`/${locale}/search-results?q=${encodeURIComponent(q)}`}
            className={styles.exampleLink}
          >
            {q}
          </a>
        ))}
      </nav>
    </div>
  );
}
