/**
 * Phase 2 deferred fields (editorial / taxonomy inputs):
 *   signOrSymptom, associatedAnatomy, epidemiology, differentialDiagnosis
 */

export type MedicalConditionInput = {
  title: string;
  pageUrl: string;
  description?: string;
  locale: string;
  datePublished?: string | null;
  dateModified?: string | null;
};

export type MedicalConditionLd = {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  description?: string;
  inLanguage: string;
  datePublished?: string;
  dateModified?: string;
};

export function buildMedicalConditionLd(input: MedicalConditionInput): MedicalConditionLd {
  const result: MedicalConditionLd = {
    "@context": "https://schema.org",
    "@type": "MedicalCondition",
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

  return result;
}
