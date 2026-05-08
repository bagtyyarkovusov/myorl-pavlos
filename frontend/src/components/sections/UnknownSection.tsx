import { PageSection } from "@/components/PageSection";
import styles from "./UnknownSection.module.css";

type UnknownSectionProps = {
  section: { __component: string; heading?: string | null };
  sectionIndex: number;
};

export function UnknownSection({ section, sectionIndex }: UnknownSectionProps) {
  const label = section.heading || section.__component;

  return (
    <PageSection sectionIndex={sectionIndex} density="focused" width="contained">
      <div data-section="unknown" className={styles["unknown-section"]}>
        <p className={styles["unknown-label"]}>{label}</p>
        <p className={styles["unknown-hint"]}>Content updating</p>
        {process.env.NODE_ENV === "development" ? (
          <span className={styles["unknown-badge"]}>{section.__component}</span>
        ) : null}
      </div>
    </PageSection>
  );
}
