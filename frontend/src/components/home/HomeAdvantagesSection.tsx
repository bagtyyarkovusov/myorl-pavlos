import type { ReactNode } from "react";
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
            <span className={styles["credibility-card__icon"]} aria-hidden="true">
              <AdvantageIcon iconKey={item.icon} index={index} />
            </span>
            {item.title ? <h3>{item.title}</h3> : null}
            <CmsHtml className={styles["credibility-card__text"]} html={item.description} />
          </li>
        ))}
      </ul>
    </PageSection>
  );
}

function AdvantageIcon({ iconKey, index }: { iconKey?: string | null; index: number }) {
  const path = resolveIconPath(iconKey, index);
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
      {path}
    </svg>
  );
}

function resolveIconPath(iconKey: string | null | undefined, index: number): ReactNode {
  if (iconKey) {
    const normalized = iconKey.toLowerCase().trim();
    for (const [keyword, node] of Object.entries(KEYWORD_ICONS)) {
      if (normalized.includes(keyword)) {
        return node;
      }
    }
  }
  return DEFAULT_ICONS[index % DEFAULT_ICONS.length];
}

const ICON_EXPERIENCE = (
  <>
    <path d="M12 2l2.39 4.84L20 8l-4 3.9.94 5.5L12 14.77l-4.94 2.6L8 11.9 4 8l5.61-1.16L12 2z" strokeLinejoin="round" strokeLinecap="round" />
  </>
);

const ICON_SHIELD = (
  <>
    <path d="M12 3l8 3v6c0 4.97-3.4 9.04-8 10-4.6-.96-8-5.03-8-10V6l8-3z" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M9 12.5l2 2 4-4" strokeLinejoin="round" strokeLinecap="round" />
  </>
);

const ICON_HEART = (
  <>
    <path
      d="M20.42 5.58a5.5 5.5 0 0 0-7.78 0L12 6.22l-.64-.64a5.5 5.5 0 1 0-7.78 7.78L12 21.78l8.42-8.42a5.5 5.5 0 0 0 0-7.78z"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </>
);

const ICON_TECH = (
  <>
    <rect x="3" y="4" width="18" height="13" rx="2" />
    <path d="M8 21h8M10 17v4M14 17v4" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M8 9l3 3 5-5" strokeLinejoin="round" strokeLinecap="round" />
  </>
);

const ICON_DOCTOR = (
  <>
    <circle cx="12" cy="8" r="4" />
    <path d="M5 21v-1a5 5 0 0 1 5-5h4a5 5 0 0 1 5 5v1" strokeLinejoin="round" strokeLinecap="round" />
    <path d="M12 12v3" strokeLinejoin="round" strokeLinecap="round" />
  </>
);

const ICON_CLOCK = (
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7v5l3 2" strokeLinejoin="round" strokeLinecap="round" />
  </>
);

const ICON_SPARKLE = (
  <>
    <path
      d="M12 3v4M12 17v4M3 12h4M17 12h4M5.6 5.6l2.8 2.8M15.6 15.6l2.8 2.8M5.6 18.4l2.8-2.8M15.6 8.4l2.8-2.8"
      strokeLinejoin="round"
      strokeLinecap="round"
    />
  </>
);

const ICON_AWARD = (
  <>
    <circle cx="12" cy="9" r="6" />
    <path d="M8.21 13.89L7 22l5-3 5 3-1.21-8.12" strokeLinejoin="round" strokeLinecap="round" />
  </>
);

const KEYWORD_ICONS: Record<string, ReactNode> = {
  shield: ICON_SHIELD,
  trust: ICON_SHIELD,
  safe: ICON_SHIELD,
  protect: ICON_SHIELD,
  heart: ICON_HEART,
  care: ICON_HEART,
  patient: ICON_HEART,
  tech: ICON_TECH,
  equipment: ICON_TECH,
  device: ICON_TECH,
  modern: ICON_TECH,
  doctor: ICON_DOCTOR,
  team: ICON_DOCTOR,
  expert: ICON_DOCTOR,
  staff: ICON_DOCTOR,
  experience: ICON_EXPERIENCE,
  star: ICON_EXPERIENCE,
  quality: ICON_EXPERIENCE,
  clock: ICON_CLOCK,
  fast: ICON_CLOCK,
  time: ICON_CLOCK,
  appointment: ICON_CLOCK,
  spark: ICON_SPARKLE,
  innov: ICON_SPARKLE,
  award: ICON_AWARD,
  certif: ICON_AWARD,
  best: ICON_AWARD,
};

const DEFAULT_ICONS: ReactNode[] = [ICON_EXPERIENCE, ICON_DOCTOR, ICON_TECH, ICON_HEART];
