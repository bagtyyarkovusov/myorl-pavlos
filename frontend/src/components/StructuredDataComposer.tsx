import { StructuredData } from "@/components/StructuredData";
import { getCmsConfig } from "@/lib/cms/env";
import { buildWebPageLd } from "@/lib/structured-data/webpage";
import { buildWebSiteLd } from "@/lib/structured-data/website";
import { buildPageBreadcrumbLd } from "@/lib/structured-data/page-breadcrumbs";
import { buildFaqPageLd } from "@/lib/structured-data/faq";
import { buildVideoObjectLd } from "@/lib/structured-data/video-object";
import { buildImageObjectLd } from "@/lib/structured-data/image-object";
import type { PageDTO, SectionDTO } from "@/lib/cms/types";

type StructuredDataComposerProps = {
  page: PageDTO;
};

function buildSectionSchemas(sections: SectionDTO[]): Record<string, unknown>[] {
  const schemas: Record<string, unknown>[] = [];

  for (const section of sections) {
    switch (section.__component) {
      case "sections.faq": {
        const ld = buildFaqPageLd(
          section.items
            .filter((i) => i.question && i.answer)
            .map((i) => ({ question: i.question!, answer: i.answer! })),
        );
        if (ld) schemas.push(ld);
        break;
      }
      case "sections.video": {
        const ld = buildVideoObjectLd(section.videos);
        if (ld) {
          for (const video of ld) {
            schemas.push(video);
          }
        }
        break;
      }
      case "sections.gallery": {
        const ld = buildImageObjectLd(section.items);
        if (ld) {
          for (const image of ld) {
            schemas.push(image);
          }
        }
        break;
      }
    }
  }

  return schemas;
}

export function StructuredDataComposer({ page }: StructuredDataComposerProps) {
  const config = getCmsConfig();
  const webSiteLd = buildWebSiteLd(config.siteUrl, "MyORL");
  const webPageLd = buildWebPageLd(page, config.siteUrl);
  const breadcrumbLd = buildPageBreadcrumbLd(page);
  const sectionSchemas = buildSectionSchemas(page.sections);

  const graph = [webSiteLd, webPageLd, ...(breadcrumbLd ? [breadcrumbLd] : []), ...sectionSchemas];

  return <StructuredData data={{ "@context": "https://schema.org", "@graph": graph }} />;
}
