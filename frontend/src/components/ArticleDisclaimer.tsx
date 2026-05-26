import type { Locale } from "@/lib/cms/types";
import styles from "./ArticleDisclaimer.module.css";

const ARIA_LABELS: Record<Locale, string> = {
  el: "Ιατρική αποποίηση",
  ru: "Медицинский дисклеймер",
};

type ArticleDisclaimerProps = {
  disclaimerText: string;
  locale: Locale;
};

export function ArticleDisclaimer({ disclaimerText, locale }: ArticleDisclaimerProps) {
  return (
    <aside role="note" aria-label={ARIA_LABELS[locale]} className={styles.disclaimer}>
      <p>{disclaimerText}</p>
    </aside>
  );
}
