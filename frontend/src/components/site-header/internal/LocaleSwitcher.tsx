"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { subscribe, getSnapshot } from "@/lib/i18n/alternate-url-store";
import type { Locale } from "@/lib/cms/types";

import styles from "../../SiteHeaderClient.module.css";

const LOCALE_LABELS: Record<Locale, string> = {
  el: "GR",
  ru: "RU",
};

function switchLocaleInPath(pathname: string, targetLocale: Locale): string {
  const localePattern = /^\/(el|ru)(\/|$)/;
  if (localePattern.test(pathname)) {
    return pathname.replace(localePattern, `/${targetLocale}$2`);
  }
  return `/${targetLocale}${pathname}`;
}

function resolveLocaleHref(
  pathname: string | null,
  targetLocale: Locale,
  alternateUrls: Partial<Record<Locale, string>>,
): string {
  if (alternateUrls[targetLocale]) return alternateUrls[targetLocale];
  return switchLocaleInPath(pathname ?? "/", targetLocale);
}

type LocaleSwitcherProps = {
  locale: Locale;
  languageLabel: string;
};

export function LocaleSwitcher({ locale, languageLabel }: LocaleSwitcherProps) {
  const pathname = usePathname();
  const alternateUrls = useSyncExternalStore(subscribe, getSnapshot);
  const locales = Object.keys(LOCALE_LABELS) as Locale[];

  return (
    <div className={styles["locale-switcher"]} aria-label={languageLabel}>
      {locales.map((item) => (
        <Link
          key={item}
          href={resolveLocaleHref(pathname, item, alternateUrls)}
          hrefLang={item}
          aria-current={item === locale ? "page" : undefined}
        >
          {LOCALE_LABELS[item]}
        </Link>
      ))}
    </div>
  );
}
