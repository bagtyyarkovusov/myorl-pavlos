"use client";

import { useEffect } from "react";
import { setAlternateUrls, clearAlternateUrls } from "@/lib/i18n/alternate-url-store";
import type { Locale } from "@/lib/cms/types";

type AlternateUrlsSetterProps = {
  urls: Partial<Record<Locale, string>>;
};

export function AlternateUrlsSetter({ urls }: AlternateUrlsSetterProps) {
  useEffect(() => {
    setAlternateUrls(urls);
    return () => {
      clearAlternateUrls();
    };
  }, [urls]);

  return null;
}
