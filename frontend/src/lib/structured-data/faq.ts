export type FaqItem = {
  question: string;
  answer: string;
};

export type FaqPageLd = {
  "@context": string;
  "@type": string;
  mainEntity: Array<{
    "@type": string;
    name: string;
    acceptedAnswer: {
      "@type": string;
      text: string;
    };
  }>;
};

/**
 * Builds a Schema.org `FAQPage` from a list of question/answer pairs.
 *
 * @param items - FAQ items extracted from a CMS `sections.faq` component.
 * @returns A `FAQPage` JSON-LD object, or `null` if no items.
 */
export function buildFaqPageLd(items: FaqItem[]): FaqPageLd | null {
  if (items.length === 0) return null;

  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };
}
