import type { GlobalSettingsDTO, Locale } from "@/lib/cms/types";

export type ResolvedPhoneLink = {
  tel: string;
  display: string;
};

function compactAddressFromCms(raw: string): string {
  return raw
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(", ");
}

export function resolveFooterAddressLine(
  settings: GlobalSettingsDTO,
  _locale: Locale,
): string | null {
  if (!settings.address?.trim()) {
    return null;
  }
  return compactAddressFromCms(settings.address);
}

/** Multi-line block for visit section / map query. */
export function resolveVisitAddressBlock(
  settings: GlobalSettingsDTO,
  _locale: Locale,
): string | null {
  if (!settings.address?.trim()) {
    return null;
  }
  return settings.address.trim();
}

export function resolveVisitHours(settings: GlobalSettingsDTO, _locale: Locale): string | null {
  return settings.hours?.trim() || null;
}

/** Single-line hours for the desktop utility bar (footer/drawer keep pre-line blocks). */
export function formatUtilityBarHours(hours: string | null | undefined): string | null {
  if (!hours?.trim()) {
    return null;
  }

  const lines = hours
    .trim()
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  return lines.length > 0 ? lines.join(" · ") : null;
}

export function resolvePhoneDisplay(settings: GlobalSettingsDTO): string | null {
  return settings.phoneDisplay?.trim() || null;
}

export function resolvePhoneTel(settings: GlobalSettingsDTO): string | null {
  return settings.phoneTel?.trim() || null;
}

export function resolveSecondaryPhoneDisplay(settings: GlobalSettingsDTO): string | null {
  return settings.secondaryPhoneDisplay?.trim() || null;
}

export function resolveSecondaryPhoneTel(settings: GlobalSettingsDTO): string | null {
  return settings.secondaryPhoneTel?.trim() || null;
}

export function resolveContactEmail(settings: GlobalSettingsDTO): string | null {
  return settings.email?.trim() || null;
}

export function resolveDoctorName(settings: GlobalSettingsDTO): string | null {
  return settings.doctorName?.trim() || null;
}

export function resolveDoctorSpecialty(settings: GlobalSettingsDTO): string | null {
  return settings.doctorSpecialty?.trim() || null;
}

export function resolveTransitNote(settings: GlobalSettingsDTO): string | null {
  return settings.transitNote?.trim() || null;
}

export function resolvePhoneSeparator(locale: Locale): string {
  return locale === "ru" ? "или" : "ή";
}

/** Mobile sticky call button prefers the clinic mobile line. */
export function resolveMobileCallTel(settings: GlobalSettingsDTO): string | null {
  return resolveSecondaryPhoneTel(settings) ?? resolvePhoneTel(settings);
}

export function resolvePrimaryPhoneLinks(settings: GlobalSettingsDTO): ResolvedPhoneLink[] {
  const links: ResolvedPhoneLink[] = [];
  const primaryTel = resolvePhoneTel(settings);
  const primaryDisplay = resolvePhoneDisplay(settings);
  if (primaryTel && primaryDisplay) {
    links.push({ tel: primaryTel, display: primaryDisplay });
  }

  const secondaryTel = resolveSecondaryPhoneTel(settings);
  const secondaryDisplay = resolveSecondaryPhoneDisplay(settings);
  if (secondaryTel && secondaryDisplay) {
    links.push({ tel: secondaryTel, display: secondaryDisplay });
  }

  return links;
}

export function mapEmbedSrcFromAddress(addressBlock: string): string {
  const q = encodeURIComponent(compactAddressFromCms(addressBlock));
  return `https://maps.google.com/maps?q=${q}&z=16&output=embed&hl=el`;
}

/**
 * User-facing Google Maps link for the clinic address. Opens Maps on click in a
 * new tab — unlike the embedded map, this needs no consent gating because the
 * user initiates it.
 */
export function mapsSearchUrl(addressBlock: string): string {
  const q = encodeURIComponent(compactAddressFromCms(addressBlock));
  return `https://www.google.com/maps/search/?api=1&query=${q}`;
}
