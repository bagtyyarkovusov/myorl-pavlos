/**
 * Phase 2 deferred fields (editorial / taxonomy inputs):
 *   procedureType, bodyLocation, preparation, followup
 */

export type MedicalProcedureInput = {
  title: string;
  pageUrl: string;
  description?: string;
  locale: string;
  datePublished?: string | null;
  dateModified?: string | null;
  reviewedBy?: string | null;
  lastReviewed?: string | null;
};

export type MedicalProcedureLd = {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  description?: string;
  inLanguage: string;
  datePublished?: string;
  dateModified?: string;
  reviewedBy?: { "@type": "Person"; name: string };
  lastReviewed?: string;
};

export function buildMedicalProcedureLd(input: MedicalProcedureInput): MedicalProcedureLd {
  const result: MedicalProcedureLd = {
    "@context": "https://schema.org",
    "@type": "MedicalProcedure",
    name: input.title,
    url: input.pageUrl,
    inLanguage: input.locale,
  };

  if (input.description) {
    result.description = input.description;
  }

  if (input.datePublished) {
    result.datePublished = input.datePublished;
  }

  if (input.dateModified) {
    result.dateModified = input.dateModified;
  }

  if (input.reviewedBy && input.lastReviewed) {
    result.reviewedBy = { "@type": "Person", name: input.reviewedBy };
    result.lastReviewed = input.lastReviewed;
  }

  return result;
}
