import Link from "next/link";

import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getPageStrings } from "@/lib/i18n/page";
import { findAppointmentHref } from "@/lib/navigation/appointment-href";

import { PageHeader, type PageLayoutProps } from "./_shared";
import layoutStyles from "./_shared.module.css";

export function QuestionListPage({ page, navigation = [] }: PageLayoutProps) {
  const t = getPageStrings(page.locale);
  const appointmentHref = findAppointmentHref(
    navigation,
    page.locale,
    `/${page.locale}/appointment`,
  );

  return (
    <PageSection rhythm="compact" entranceMotion="instant">
      <div className={layoutStyles["directory-page-stack"]}>
        <PageHeader page={page} kicker={null} heroImageVariant="accent" />
        {page.content ? (
          <CmsHtml html={page.content} className={layoutStyles["directory-intro"]} />
        ) : null}
        {page.sections.map((section, index) => (
          <SectionRenderer
            key={`${section.__component}-${index}`}
            section={section}
            context="question-list"
            locale={page.locale}
            index={index}
          />
        ))}
        <aside className={layoutStyles["directory-closure"]} aria-label={t.bookConsultation}>
          <p>{t.questionListClosureCopy}</p>
          <Link href={appointmentHref} className={layoutStyles["service-cta"]}>
            {t.bookConsultation}
          </Link>
        </aside>
      </div>
    </PageSection>
  );
}
