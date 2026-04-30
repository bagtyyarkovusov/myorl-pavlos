import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function QuestionListPage({ page }: PageLayoutProps) {
  return (
    <PageSection>
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      {page.sections.map((section) => (
        <SectionRenderer key={section.__component} section={section} />
      ))}
    </PageSection>
  );
}
