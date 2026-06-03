import { createLifecycleHandlers } from "../../../../utils/revalidate";
import { validatePageSectionsForLayout } from "./home-section-policy";

function tagsForPage(event: any): string[] {
  const result = event?.result;
  const locale = typeof result?.locale === "string" ? result.locale.trim() : null;
  const documentId = typeof result?.documentId === "string" ? result.documentId.trim() : null;

  const tags: string[] = ["pages", "sitemap"];

  if (locale) {
    tags.push("locale:" + locale);
    tags.push("navigation:" + locale);
  }
  if (documentId) {
    tags.push("page:" + documentId);
  }

  return tags;
}

const revalidationHandlers = createLifecycleHandlers(tagsForPage);

type LifecycleEvent = {
  params: {
    data?: Record<string, unknown>;
  };
};

function validatePageSections(event: LifecycleEvent): void {
  if (event.params.data) {
    validatePageSectionsForLayout(event.params.data);
  }
}

export default {
  beforeCreate(event: LifecycleEvent): void {
    validatePageSections(event);
  },

  beforeUpdate(event: LifecycleEvent): void {
    validatePageSections(event);
  },

  ...revalidationHandlers,
};
