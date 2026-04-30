import { HomeSectionRenderer } from "./HomeSectionRenderer";
import { DefaultSectionRenderer } from "./DefaultSectionRenderer";
import { PageSection } from "@/components/PageSection";
import type { Locale, SectionDTO } from "@/lib/cms/types";

type SectionRendererProps = {
  section: SectionDTO;
  context?: "default" | "home";
  locale?: Locale;
};

export function SectionRenderer({ section, context = "default", locale = "el" }: SectionRendererProps) {
  const isHome = context === "home";

  const headingBlock =
    section.heading || section.intro
      ? { title: section.heading ?? "", intro: section.intro ?? undefined }
      : undefined;

  return (
    <PageSection heading={headingBlock} rhythm={isHome ? "compact" : "standard"}>
      {isHome ? (
        <HomeSectionRenderer section={section} locale={locale} />
      ) : (
        <DefaultSectionRenderer section={section} />
      )}
    </PageSection>
  );
}
