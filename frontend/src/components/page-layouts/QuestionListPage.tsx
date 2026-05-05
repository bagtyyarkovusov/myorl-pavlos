import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionTabBar } from "@/components/SectionTabBar";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function QuestionListPage({ page, navigation = [] }: PageLayoutProps) {
  return (
    <PageSection>
      <PageHeader page={page} />
      <SectionTabBar navigation={navigation} currentPage={page} />
      <CmsHtml html={page.content} />
      {page.sections.map((section) => (
        <SectionRenderer key={section.__component} section={section} />
      ))}
    </PageSection>
  );
}
