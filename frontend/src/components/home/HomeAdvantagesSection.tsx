import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import type { SectionDTO } from "@/lib/cms/types";

import styles from "./home.module.css";

type AdvantagesSection = Extract<SectionDTO, { __component: "sections.advantages" }>;

export function HomeAdvantagesSection({ section }: { section: AdvantagesSection }) {
  if (section.items.length === 0) {
    return null;
  }

  return (
    <PageSection
      background="surface"
      rhythm="compact"
      className={styles["credibility-section"]}
      heading={
        section.heading || section.intro
          ? {
              title: section.heading ?? "",
              intro: section.intro ?? undefined,
            }
          : undefined
      }
      label={section.heading ?? undefined}
    >
      <ul className={styles["credibility-band"]} role="list">
        {section.items.map((item, index) => (
          <li className={styles["credibility-card"]} key={`${item.title ?? "a"}-${index}`}>
            {item.icon ? <span>{item.icon}</span> : null}
            {item.title ? <h3>{item.title}</h3> : null}
            <CmsHtml className={styles["credibility-card__text"]} html={item.description} />
          </li>
        ))}
      </ul>
    </PageSection>
  );
}
