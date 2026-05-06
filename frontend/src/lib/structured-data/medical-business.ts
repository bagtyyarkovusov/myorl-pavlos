export type AggregateRatingInput = {
  ratingValue: number;
  reviewCount: number;
};

export type MedicalBusinessInput = {
  siteUrl: string;
  name: string;
  description?: string;
  telephone?: string;
  address?: string;
  imageUrls?: string[];
  aggregateRating?: AggregateRatingInput;
};

export type MedicalBusinessLd = {
  "@context": string;
  "@type": string;
  name: string;
  url: string;
  description?: string;
  telephone?: string;
  address?: {
    "@type": string;
    streetAddress: string;
    addressCountry: string;
  };
  medicalSpecialty: {
    "@type": string;
    name: string;
  };
  image?: string[];
  aggregateRating?: {
    "@type": string;
    ratingValue: number;
    reviewCount: number;
  };
};

export function buildMedicalBusinessLd(input: MedicalBusinessInput): MedicalBusinessLd {
  const result: MedicalBusinessLd = {
    "@context": "https://schema.org",
    "@type": "MedicalBusiness",
    name: input.name,
    url: input.siteUrl,
    medicalSpecialty: {
      "@type": "MedicalSpecialty",
      name: "Otolaryngology",
    },
  };

  if (input.description) {
    result.description = input.description;
  }

  if (input.telephone) {
    result.telephone = input.telephone;
  }

  if (input.address) {
    result.address = {
      "@type": "PostalAddress",
      streetAddress: input.address,
      addressCountry: "GR",
    };
  }

  if (input.imageUrls && input.imageUrls.length > 0) {
    result.image = input.imageUrls;
  }

  if (input.aggregateRating) {
    result.aggregateRating = {
      "@type": "AggregateRating",
      ratingValue: input.aggregateRating.ratingValue,
      reviewCount: input.aggregateRating.reviewCount,
    };
  }

  return result;
}
