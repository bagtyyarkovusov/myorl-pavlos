/**
 * Phase 2 deferred fields (editorial inputs):
 *   identifier, memberOf, alumniOf, award
 */

export type PhysicianInput = {
  pageUrl: string;
  description?: string;
  locale: string;
};

export type PhysicianLd = {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  description?: string;
  medicalSpecialty: string;
  inLanguage: string;
};

export function buildPhysicianLd(input: PhysicianInput): PhysicianLd {
  const result: PhysicianLd = {
    "@context": "https://schema.org",
    "@type": "Physician",
    name: "Δρ. Παύλος Τσολαρίδης",
    url: input.pageUrl,
    medicalSpecialty: "Otorhinolaryngology",
    inLanguage: input.locale,
  };

  if (input.description) {
    result.description = input.description;
  }

  return result;
}
