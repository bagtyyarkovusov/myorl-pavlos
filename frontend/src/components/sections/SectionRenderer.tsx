import { HomeSectionRenderer } from "./HomeSectionRenderer";
import { DefaultSectionRenderer } from "./DefaultSectionRenderer";
import { PageSection } from "@/components/PageSection";
import type { Density } from "@/lib/cms/density";
import type { Locale, SectionDTO } from "@/lib/cms/types";

import styles from "./SectionRenderer.module.css";

type SectionRendererProps = {
  section: SectionDTO;
  context?: "default" | "home" | "question-list";
  locale?: Locale;
  density?: Density;
  index?: number;
  id?: string;
  galleryMode?: "cards" | "lightbox";
};

export function SectionRenderer({
  section,
  context = "default",
  locale = "el",
  density = context === "home" ? "theater" : "focused",
  index,
  id,
  galleryMode = "cards",
}: SectionRendererProps) {
  if (context === "home") {
    return <HomeSectionRenderer section={section} locale={locale} index={index} />;
  }

  const sectionOrder = index ?? 0;

  if (context === "question-list") {
    return (
      <div className={styles["section-divider"]}>
        {section.heading ? (
          <header className={styles["question-list-section-heading"]}>
            <h2>{section.heading}</h2>
            {section.intro ? <p>{section.intro}</p> : null}
          </header>
        ) : null}
        <DefaultSectionRenderer
          section={section}
          density={density}
          locale={locale}
          galleryMode={galleryMode}
          sectionIndex={sectionOrder}
          disclosureMode="single"
        />
      </div>
    );
  }

  const headingBlock =
    section.heading || section.intro
      ? { title: section.heading ?? "", intro: section.intro ?? undefined }
      : undefined;

  return (
    <PageSection
      id={id}
      heading={headingBlock}
      rhythm="standard"
      sectionIndex={sectionOrder}
      density={density}
      width="contained"
      className={styles["section-divider"]}
    >
      <DefaultSectionRenderer
        section={section}
        density={density}
        locale={locale}
        galleryMode={galleryMode}
        sectionIndex={sectionOrder}
      />
    </PageSection>
  );
}
