import { HomeSectionRenderer } from "./HomeSectionRenderer";
import { DefaultSectionRenderer } from "./DefaultSectionRenderer";
import { PageSection } from "@/components/PageSection";
import type { Locale, SectionDTO } from "@/lib/cms/types";

type SectionRendererProps = {
  section: SectionDTO;
  context?: "default" | "home";
  locale?: Locale;
};

export function SectionRenderer({
  section,
  context = "default",
  locale = "el",
}: SectionRendererProps) {
  if (context === "home") {
    return <HomeSectionRenderer section={section} locale={locale} />;
  }

  const headingBlock =
    section.heading || section.intro
      ? { title: section.heading ?? "", intro: section.intro ?? undefined }
      : undefined;

  return (
    <PageSection heading={headingBlock} rhythm="standard">
      <DefaultSectionRenderer section={section} />
    </PageSection>
  );
}
