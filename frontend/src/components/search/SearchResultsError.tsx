import type { Locale } from "@/lib/cms/types";
import styles from "./SearchResultsError.module.css";

export type SearchResultsErrorProps = {
  type: "unavailable" | "network";
  locale: Locale;
  retryPath?: string;
};

type Labels = {
  unavailableTitle: string;
  unavailableBody: string;
  articlesLabel: string;
  videosLabel: string;
  networkTitle: string;
  retry: string;
};

const t: Record<Locale, Labels> = {
  el: {
    unavailableTitle: "Η αναζήτηση είναι προσωρινά μη διαθέσιμη",
    unavailableBody: "Δοκιμάστε ξανά σε λίγο ή περιηγηθείτε απευθείας στο περιεχόμενό μας.",
    articlesLabel: "Άρθρα",
    videosLabel: "Βίντεο",
    networkTitle: "Δεν ήταν δυνατή η σύνδεση.",
    retry: "Επανάληψη",
  },
  ru: {
    unavailableTitle: "Поиск временно недоступен",
    unavailableBody: "Повторите попытку позже или просмотрите содержимое напрямую.",
    articlesLabel: "Статьи",
    videosLabel: "Видео",
    networkTitle: "Не удалось подключиться.",
    retry: "Повторить",
  },
};

export function SearchResultsError({ type, locale, retryPath }: SearchResultsErrorProps) {
  const labels = t[locale];

  if (type === "unavailable") {
    return (
      <div role="alert" className={styles.alert}>
        <h1 className={styles.heading}>{labels.unavailableTitle}</h1>
        <p className={styles.body}>{labels.unavailableBody}</p>
        <nav className={styles.navLinks}>
          <a href={`/${locale}`} className={styles.navLink}>
            {labels.articlesLabel}
          </a>
          <a href={`/${locale}/video`} className={styles.navLink}>
            {labels.videosLabel}
          </a>
        </nav>
      </div>
    );
  }

  return (
    <div role="alert" className={styles.alert}>
      <p className={styles.networkTitle}>{labels.networkTitle}</p>
      {retryPath && (
        <a href={retryPath} className={styles.retryLink}>
          {labels.retry}
        </a>
      )}
    </div>
  );
}
