import type { Locale } from "@/lib/cms/types";

/** Greek footer labels for known CMS slugs when navLabel/title is still in English. */
const EL_SLUG_LABELS: Record<string, string> = {
  video: "Βίντεο",
  rantevou: "Κλείστε ραντεβού ηλεκτρονικά",
};

/** Exact Greek CMS labels to replace when editors left English loanwords. */
const EL_LABEL_OVERRIDES: Record<string, string> = {
  "Online ραντεβού": "Κλείστε ραντεβού ηλεκτρονικά",
  "Κλείστε ραντεβού Online": "Κλείστε ραντεβού ηλεκτρονικά",
  Video: "Βίντεο",
};

export function resolveFooterNavLabel(locale: Locale, slug: string, label: string): string {
  if (locale !== "el") {
    return label;
  }

  const trimmed = label.trim();
  return EL_SLUG_LABELS[slug] ?? EL_LABEL_OVERRIDES[trimmed] ?? EL_LABEL_OVERRIDES[label] ?? label;
}
