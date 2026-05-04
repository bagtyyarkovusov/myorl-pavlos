import type { GlobalSettingsDTO, Locale } from "@/lib/cms/types";

/** Strapi `global` has no email field yet — keep aligned with legacy site. */
export const HARDCODED_CONTACT_EMAIL = "info@myorl.gr";

const DEFAULT_PHONE_DISPLAY = "+30 210 6427 000";
const DEFAULT_PHONE_TEL = "+302106427000";

/** One line for footer (design reference). */
const FOOTER_ADDRESS_LINE: Record<Locale, string> = {
  el: "Λεωφ. Αλεξάνδρας 201, Αθήνα 11523",
  ru: "проспект Александрас 201, Афины 11523",
};

const BLOCK_ADDRESS: Record<Locale, string> = {
  el: "Λεωφ. Αλεξάνδρας 201\nΑμπελόκηποι, Αθήνα 11523",
  ru: "проспект Александрас 201\nАмбелокипи, Афины 11523",
};

const FALLBACK_HOURS: Record<Locale, string> = {
  el: "Δευ–Παρ · 09:00 – 21:00\nΣάβ · 10:00 – 14:00",
  ru: "Пн–Пт · 09:00 – 21:00\nСб · 10:00 – 14:00",
};

function compactAddressFromCms(raw: string): string {
  return raw
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(", ");
}

export function resolveFooterAddressLine(settings: GlobalSettingsDTO, locale: Locale): string {
  if (settings.address?.trim()) {
    return compactAddressFromCms(settings.address);
  }
  return FOOTER_ADDRESS_LINE[locale];
}

/** Multi-line block for visit section / map query. */
export function resolveVisitAddressBlock(settings: GlobalSettingsDTO, locale: Locale): string {
  if (settings.address?.trim()) {
    return settings.address.trim();
  }
  return BLOCK_ADDRESS[locale];
}

export function resolveVisitHours(settings: GlobalSettingsDTO, locale: Locale): string {
  if (settings.hours?.trim()) {
    return settings.hours.trim();
  }
  return FALLBACK_HOURS[locale];
}

export function resolvePhoneDisplay(settings: GlobalSettingsDTO): string {
  return settings.phoneDisplay?.trim() || DEFAULT_PHONE_DISPLAY;
}

export function resolvePhoneTel(settings: GlobalSettingsDTO): string {
  return settings.phoneTel?.trim() || DEFAULT_PHONE_TEL;
}

export function resolveContactEmail(): string {
  return HARDCODED_CONTACT_EMAIL;
}

export function mapEmbedSrcFromAddress(addressBlock: string): string {
  const q = encodeURIComponent(compactAddressFromCms(addressBlock));
  return `https://maps.google.com/maps?q=${q}&z=16&output=embed&hl=el`;
}
