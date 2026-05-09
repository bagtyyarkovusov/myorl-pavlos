import type { ContactClinicDTO, SectionDTO } from "@/lib/cms/types";
import { stripTags } from "@/lib/html";

type ContactSection = Extract<SectionDTO, { __component: "sections.contact" }>;

export type ContactAction = {
  label: string;
  href: string;
};

export type ContactMapModel = {
  src: string;
  query: string;
  center?: string;
  source: "coordinates" | "address";
};

export type ContactRenderModel = {
  section: ContactSection;
  clinics: ContactClinicDTO[];
  initialActiveClinicName: string | null;
  primaryPhoneAction: ContactAction | null;
  primaryEmailAction: ContactAction | null;
  map: ContactMapModel | null;
};

export function buildContactRenderModel(section: ContactSection): ContactRenderModel {
  const coordinateClinic = section.clinics.find(hasCoordinates) ?? null;
  const addressClinic = section.clinics.find((clinic) => stripTags(clinic.addressHtml)) ?? null;
  const primaryPhone = section.clinics.find((clinic) => clinic.phone)?.phone ?? null;
  const primaryEmail = section.clinics.find((clinic) => clinic.email)?.email ?? null;

  return {
    section,
    clinics: section.clinics,
    initialActiveClinicName: coordinateClinic?.name ?? section.clinics[0]?.name ?? null,
    primaryPhoneAction: primaryPhone
      ? { label: primaryPhone, href: `tel:${formatTelHref(primaryPhone)}` }
      : null,
    primaryEmailAction: primaryEmail
      ? { label: primaryEmail, href: `mailto:${primaryEmail}` }
      : null,
    map: buildContactMapModel(coordinateClinic, addressClinic),
  };
}

export function buildContactMapModel(
  coordinateClinic: ContactClinicDTO | null,
  addressClinic: ContactClinicDTO | null,
): ContactMapModel | null {
  if (coordinateClinic && hasCoordinates(coordinateClinic)) {
    const query = `${coordinateClinic.latitude},${coordinateClinic.longitude}`;
    return {
      src: mapSrcFromQuery(query),
      query,
      center: query,
      source: "coordinates",
    };
  }

  const addressQuery = stripTags(addressClinic?.addressHtml);
  if (!addressQuery) return null;

  return {
    src: mapSrcFromQuery(addressQuery),
    query: addressQuery,
    source: "address",
  };
}

export function formatTelHref(value: string): string {
  return value.replace(/[^\d+]/g, "");
}

export function hasCoordinates(clinic: ContactClinicDTO): clinic is ContactClinicDTO & {
  latitude: number;
  longitude: number;
} {
  return typeof clinic.latitude === "number" && typeof clinic.longitude === "number";
}

function mapSrcFromQuery(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=14&output=embed`;
}
