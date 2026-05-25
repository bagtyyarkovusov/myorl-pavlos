import type { Locale } from "@/lib/cms/types";

const bannerText: Record<Locale, string> = {
  el: "Δεν βρέθηκαν αποτελέσματα στα ελληνικά — εμφανίζονται αποτελέσματα στα ρωσικά",
  ru: "Результаты на русском не найдены — показаны результаты на греческом",
};

const allLangsLabel: Record<Locale, string> = {
  el: "Όλες οι γλώσσες",
  ru: "Все языки",
};

type SearchLocaleFallbackBannerProps = {
  locale: Locale;
  allLangs?: boolean;
};

export function SearchLocaleFallbackBanner({
  locale,
  allLangs = false,
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
      {allLangs ? allLangsLabel[locale] : bannerText[locale]}
    </p>
  );
}
