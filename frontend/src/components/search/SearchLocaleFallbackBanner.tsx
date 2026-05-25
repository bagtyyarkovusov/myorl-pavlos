import type { Locale } from "@/lib/cms/types";

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
    <p
      role="status"
      style={{
        padding: "12px 16px",
        marginBottom: "16px",
        backgroundColor: "var(--color-warning-bg, #fff3cd)",
        border: "1px solid var(--color-warning-border, #ffc107)",
        borderRadius: "6px",
      }}
    >
      {allLangs ? allLangsLabel[locale] : bannerText(locale, resultCount)}
    </p>
  );
}
