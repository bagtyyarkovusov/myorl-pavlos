export const LOCALES = ["el", "ru"] as const;

export type Locale = (typeof LOCALES)[number];

export function isLocale(value: string): value is Locale {
  return LOCALES.includes(value as Locale);
}

export type MediaDTO = {
  url: string;
  alternativeText?: string | null;
  width?: number | null;
  height?: number | null;
};

export type PageRefDTO = {
  documentId: string;
  slug?: string | null;
  title?: string | null;
};
