import Link from "next/link";

import { ArticleDisclaimer } from "@/components/ArticleDisclaimer";
import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getPageStrings } from "@/lib/i18n/page";
import { defaultAppointmentHref } from "@/lib/navigation/appointment-href";

import { PageHeader, type PageLayoutProps } from "./_shared";
import { shouldShowArticleDisclaimer } from "./PageBody";
import layoutStyles from "./_shared.module.css";

export function QuestionListPage({ page, appointmentHref, disclaimerText }: PageLayoutProps) {
  const t = getPageStrings(page.locale);
  const bookHref = appointmentHref ?? defaultAppointmentHref(page.locale);

  return (
    <PageSection rhythm="page">
      <div className={layoutStyles["directory-page-stack"]}>
        <PageHeader page={page} kicker={null} heroImageVariant="accent" showTags={false} />
        {page.articleAuthor ? (
          <p className={layoutStyles["article-byline"]}>
            <span>{t.author}</span>
            <strong>{page.articleAuthor}</strong>
          </p>
        ) : null}
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
        {page.sources ? (
          <section className={layoutStyles["sources-footer"]} aria-label={t.sources}>
            <p className={layoutStyles["sources-footer__label"]}>{t.sources}</p>
            <CmsHtml
              html={page.sources}
              className={layoutStyles["sources-block"]}
              locale={page.locale}
            />
          </section>
        ) : null}
        {shouldShowArticleDisclaimer(page, disclaimerText) ? (
          <ArticleDisclaimer disclaimerText={disclaimerText} locale={page.locale} />
        ) : null}
        <aside className={layoutStyles["directory-closure"]} aria-label={t.bookConsultation}>
          <p>{t.questionListClosureCopy}</p>
          <Link href={bookHref} className={layoutStyles["service-cta"]}>
            {t.bookConsultation}
          </Link>
        </aside>
      </div>
    </PageSection>
  );
}
