import type { Locale } from "@/lib/cms/types";

import elData from "@/data/testimonials/el.json";
import ruData from "@/data/testimonials/ru.json";

export type CuratedTestimonial = {
  id: string;
  quote: string;
  author: string;
  rating?: number;
};

export function getCuratedTestimonials(locale: Locale): CuratedTestimonial[] {
  const raw = locale === "el" ? elData : ruData;
  return raw as CuratedTestimonial[];
}
