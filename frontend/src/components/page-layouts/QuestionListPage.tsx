import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionTabBar } from "@/components/SectionTabBar";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { StructuredData } from "@/components/StructuredData";
import { buildFaqPageLd } from "@/lib/structured-data/faq";
import { buildPageBreadcrumbLd } from "@/lib/structured-data/page-breadcrumbs";
import type { SectionDTO } from "@/lib/cms/types";
import { PageHeader, type PageLayoutProps } from "./_shared";

type FaqSection = Extract<SectionDTO, { __component: "sections.faq" }>;

export function QuestionListPage({ page, navigation = [] }: PageLayoutProps) {
  const breadcrumbLd = buildPageBreadcrumbLd(page);

  const faqItems = page.sections
    .filter((s): s is FaqSection => s.__component === "sections.faq")
    .flatMap((s) =>
      s.items
        .filter((item) => item.question && item.answer)
        .map((item) => ({ question: item.question!, answer: item.answer! })),
    );
  const faqLd = buildFaqPageLd(faqItems);

  return (
    <PageSection>
      {breadcrumbLd ? <StructuredData data={breadcrumbLd} /> : null}
      {faqLd ? <StructuredData data={faqLd} /> : null}
      <PageHeader page={page} />
      <SectionTabBar navigation={navigation} currentPage={page} />
      <CmsHtml html={page.content} />
      {page.sections.map((section) => (
        <SectionRenderer key={section.__component} section={section} />
      ))}
    </PageSection>
  );
}
