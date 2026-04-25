import { CmsHtml } from "@/components/CmsHtml";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function HomePage({ page }: PageLayoutProps) {
  return (
    <main className="page-shell home-shell">
      <PageHeader page={page} kicker="home" />
      <CmsHtml html={page.content} />
      {page.sections.map((section, index) => (
        <SectionRenderer key={`${section.__component}-${index}`} section={section} />
      ))}
    </main>
  );
}
