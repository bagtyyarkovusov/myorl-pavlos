/**
 * Phase 2 deferred fields (editorial / taxonomy inputs):
 *   procedureType, bodyLocation, preparation, followup
 */

export type MedicalProcedureInput = {
  title: string;
  pageUrl: string;
  description?: string;
  locale: string;
};

export type MedicalProcedureLd = {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  description?: string;
  inLanguage: string;
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

  return result;
}
