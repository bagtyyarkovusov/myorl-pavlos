import styles from "./UnknownSection.module.css";

type UnknownSectionProps = {
  section: { __component: string; heading?: string | null };
};

/**
 * Content-only placeholder for sections whose `__component` is unknown to the
 * dispatcher. The outer `SectionRenderer` already provides the surrounding
 * `PageSection` (background alternation + heading), so this component MUST
 * NOT add a second wrapper — doing so produces a duplicate heading.
 */
export function UnknownSection({ section }: UnknownSectionProps) {
  return (
    <div data-section="unknown" className={styles["unknown-section"]}>
      <p className={styles["unknown-hint"]}>Content updating</p>
      {process.env.NODE_ENV === "development" ? (
        <span className={styles["unknown-badge"]}>{section.__component}</span>
      ) : null}
    </div>
  );
}
