export type ContactPointLd = {
  "@context": string;
  "@type": string;
  telephone: string;
  contactType: string;
  areaServed: string;
  availableLanguage: string[];
};

/**
 * Builds a Schema.org `ContactPoint` JSON-LD object.
 *
 * @param telephone - The contact phone number.
 * @returns A `ContactPoint` JSON-LD object.
 */
export function buildContactPointLd(telephone: string): ContactPointLd {
  return {
    "@context": "https://schema.org",
    "@type": "ContactPoint",
    telephone,
    contactType: "Appointment",
    areaServed: "GR",
    availableLanguage: ["Greek", "Russian"],
  };
}
