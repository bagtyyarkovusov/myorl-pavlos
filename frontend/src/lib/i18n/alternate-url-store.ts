import type { Locale } from "@/lib/cms/types";

type AlternateUrlMap = Partial<Record<Locale, string>>;

type Listener = () => void;
let listeners: Listener[] = [];
let _alternateUrls: AlternateUrlMap = {};

export function setAlternateUrls(urls: AlternateUrlMap): void {
  _alternateUrls = urls;
  for (const fn of listeners) {
    fn();
  }
}

export function clearAlternateUrls(): void {
  _alternateUrls = {};
  for (const fn of listeners) {
    fn();
  }
}

export function subscribe(fn: Listener): () => void {
  listeners.push(fn);
  return () => {
    listeners = listeners.filter((l) => l !== fn);
  };
}

export function getSnapshot(): AlternateUrlMap {
  return _alternateUrls;
}
