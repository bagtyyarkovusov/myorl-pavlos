/**
 * Phase 2 deferred fields (editorial / taxonomy inputs):
 *   signOrSymptom, associatedAnatomy, epidemiology, differentialDiagnosis
 */

export type MedicalConditionInput = {
  title: string;
  pageUrl: string;
  description?: string;
  locale: string;
};

export type MedicalConditionLd = {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  description?: string;
  inLanguage: string;
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

  return result;
}
