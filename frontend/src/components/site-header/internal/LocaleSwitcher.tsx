"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSyncExternalStore } from "react";

import { subscribe, getSnapshot, getServerSnapshot } from "@/lib/i18n/alternate-url-store";
import {
  canSwitchToLocale,
  hasLoadedAlternateUrls,
  isLocaleSwitchBlocked,
  resolveLocaleHref,
} from "@/lib/i18n/locale-href";
import type { Locale } from "@/lib/cms/types";

import styles from "../../SiteHeaderClient.module.css";

const LOCALE_LABELS: Record<Locale, string> = {
  el: "GR",
  ru: "RU",
};

type LocaleSwitcherProps = {
  locale: Locale;
  languageLabel: string;
  localeUnavailableLabel: string;
};

export function LocaleSwitcher({
  locale,
  languageLabel,
  localeUnavailableLabel,
}: LocaleSwitcherProps) {
  const pathname = usePathname();
  const alternateUrls = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
  const locales = Object.keys(LOCALE_LABELS) as Locale[];
  const alternatesLoaded = hasLoadedAlternateUrls(alternateUrls);
  const isLimited = locales.some((item) => isLocaleSwitchBlocked(item, alternateUrls));

  return (
    <div
      className={`${styles["locale-switcher"]}${isLimited ? ` ${styles["locale-switcher--limited"]}` : ""}`}
      aria-label={languageLabel}
      data-alternates-loaded={alternatesLoaded ? "true" : "false"}
      data-limited={isLimited ? "true" : "false"}
    >
      {locales.map((item) => {
        const label = LOCALE_LABELS[item];
        const isCurrent = item === locale;
        const switchable = canSwitchToLocale(item, alternateUrls);

        if (isCurrent) {
          return (
            <span key={item} aria-current="page" lang={item}>
              {label}
            </span>
          );
        }

        if (!switchable) {
          return (
            <span
              key={item}
              lang={item}
              aria-disabled="true"
              title={localeUnavailableLabel}
              className={styles["locale-switcher__option--disabled"]}
            >
              {label}
            </span>
          );
        }

        return (
          <Link key={item} href={resolveLocaleHref(pathname, item, alternateUrls)} hrefLang={item}>
            {label}
          </Link>
        );
      })}
    </div>
  );
}
