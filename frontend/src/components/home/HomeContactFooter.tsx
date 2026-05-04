import { ButtonLink } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";

import styles from "./HomeContactFooter.module.css";

type HomeContactFooterProps = {
  title: string;
  appointmentHref: string;
  bookLabel: string;
  callHref: string;
  callLabel: string;
};

export function HomeContactFooter({
  title,
  appointmentHref,
  bookLabel,
  callHref,
  callLabel,
}: HomeContactFooterProps) {
  return (
    <PageSection
      rhythm="contact"
      className={`${styles["appointment-cta-section"]} ${styles["appointment-section"]}`}
    >
      <div className={styles["appointment-cta"]}>
        <div className={styles["appointment-cta__copy"]}>
          <p>MyORL Athens</p>
          <h2>{title}</h2>
        </div>
        <div className={styles["appointment-cta__actions"]}>
          <ButtonLink
            href={appointmentHref}
            className="h-14 min-w-[200px] bg-ink text-base text-bone-50 shadow-xl shadow-ink/10 hover:bg-trust"
          >
            {bookLabel}
          </ButtonLink>
          <ButtonLink
            href={callHref}
            variant="secondary"
            className="h-14 min-w-[200px] border-2 border-ink/20 text-base hover:border-trust hover:bg-trust-soft hover:text-trust"
          >
            {callLabel}
          </ButtonLink>
        </div>
      </div>
    </PageSection>
  );
}
