import Link from "next/link";

import type { Locale } from "@/lib/cms/types";

import styles from "../../SiteHeaderClient.module.css";

const LOCALE_LABELS: Record<Locale, string> = {
  el: "GR",
  ru: "RU",
};

type LocaleSwitcherProps = {
  locale: Locale;
  languageLabel: string;
};

export function LocaleSwitcher({ locale, languageLabel }: LocaleSwitcherProps) {
  const locales = Object.keys(LOCALE_LABELS) as Locale[];

  return (
    <div className={styles["locale-switcher"]} aria-label={languageLabel}>
      {locales.map((item) => (
        <Link
          key={item}
          href={`/${item}`}
          hrefLang={item}
          aria-current={item === locale ? "page" : undefined}
        >
          {LOCALE_LABELS[item]}
        </Link>
      ))}
    </div>
  );
}
