import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import type { SectionDTO } from "@/lib/cms/types";

import styles from "./HomeAdvantagesSection.module.css";

type AdvantagesSection = Extract<SectionDTO, { __component: "sections.advantages" }>;

export function HomeAdvantagesSection({ section }: { section: AdvantagesSection }) {
  const items = section.items.slice(0, 4);

  if (items.length === 0) {
    return null;
  }

  return (
    <PageSection
      rhythm="compact"
      className={styles["credibility-section"]}
      header={null}
      label={section.heading ?? undefined}
    >
      <ul className={styles["credibility-band"]} role="list">
        {items.map((item, index) => (
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
