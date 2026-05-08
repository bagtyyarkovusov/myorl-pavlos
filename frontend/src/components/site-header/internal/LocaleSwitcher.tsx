"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { Locale } from "@/lib/cms/types";

import styles from "../../SiteHeaderClient.module.css";

const LOCALE_LABELS: Record<Locale, string> = {
  el: "GR",
  ru: "RU",
};

function switchLocaleInPath(pathname: string, targetLocale: Locale): string {
  // Replace the locale prefix (e.g. /el/foo → /ru/foo, /el → /ru)
  const localePattern = /^\/(el|ru)(\/|$)/;
  if (localePattern.test(pathname)) {
    return pathname.replace(localePattern, `/${targetLocale}$2`);
  }
  // Fallback: prepend locale if path doesn't have one
  return `/${targetLocale}${pathname}`;
}

type LocaleSwitcherProps = {
  locale: Locale;
  languageLabel: string;
};

export function LocaleSwitcher({ locale, languageLabel }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const locales = Object.keys(LOCALE_LABELS) as Locale[];

  return (
    <div className={styles["locale-switcher"]} aria-label={languageLabel}>
      {locales.map((item) => (
        <Link
          key={item}
          href={switchLocaleInPath(pathname ?? "/", item)}
          hrefLang={item}
          aria-current={item === locale ? "page" : undefined}
        >
          {LOCALE_LABELS[item]}
        </Link>
      ))}
    </div>
  );
}
