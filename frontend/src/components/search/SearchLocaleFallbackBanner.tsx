import type { Locale } from "@/lib/cms/types";
import styles from "./SearchLocaleFallbackBanner.module.css";

function bannerText(locale: Locale, count: number): string {
  const other = locale === "el" ? "ρωσικά" : "греческом";
  if (locale === "el") {
    return `Δεν βρέθηκαν αποτελέσματα στα ελληνικά — εμφανίζονται ${count} αποτελέσματα στα ${other}`;
  }
  return `Результаты на русском не найдены — показаны ${count} результатов на ${other}`;
}

const allLangsLabel: Record<Locale, string> = {
  el: "Όλες οι γλώσσες",
  ru: "Все языки",
};

type SearchLocaleFallbackBannerProps = {
  locale: Locale;
  allLangs?: boolean;
  resultCount?: number;
};

export function SearchLocaleFallbackBanner({
  locale,
  allLangs = false,
  resultCount = 0,
}: SearchLocaleFallbackBannerProps) {
  return (
    <p role="status" className={styles.banner}>
      {allLangs ? allLangsLabel[locale] : bannerText(locale, resultCount)}
    </p>
  );
}
