import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { PageHeader, type PageLayoutProps } from "./_shared";

export function GalleryPage({ page }: PageLayoutProps) {
  return (
    <PageSection>
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      {page.sections.map((section, index) => (
        <SectionRenderer
          key={`${section.__component}-${index}`}
          section={section}
          index={index}
          galleryMode="lightbox"
        />
      ))}
    </PageSection>
  );
}
