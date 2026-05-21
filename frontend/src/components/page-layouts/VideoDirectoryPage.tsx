import { Suspense } from "react";
import Link from "next/link";

import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { VideoDirectoryGrid } from "@/components/video/VideoDirectoryGrid";
import { fetchVideoEntries } from "@/lib/cms/video-entries";
import { getPageStrings } from "@/lib/i18n/page";
import { findAppointmentHref } from "@/lib/navigation/appointment-href";
import type { Locale, VideoEntryDTO } from "@/lib/cms/types";

import { PageHeader, type PageLayoutProps } from "./_shared";
import layoutStyles from "./_shared.module.css";

export function VideoDirectoryPage({ page, navigation = [] }: PageLayoutProps) {
  const t = getPageStrings(page.locale);
  const appointmentHref = findAppointmentHref(navigation, page.locale);

  return (
    <PageSection rhythm="compact" entranceMotion="instant">
      <div className={layoutStyles["directory-page-stack"]}>
        <PageHeader page={page} kicker={null} heroImageVariant="accent" />
        {page.content ? (
          <CmsHtml html={page.content} className={layoutStyles["directory-intro"]} />
        ) : null}
        <Suspense
          fallback={<p className={layoutStyles["directory-intro"]}>{t.videoDirectoryEmpty}</p>}
        >
          <VideoDirectoryEntries locale={page.locale} />
        </Suspense>
        <aside className={layoutStyles["directory-closure"]} aria-label={t.directoryClosureCta}>
          <p>{t.directoryClosureCopy}</p>
          <Link href={appointmentHref} className={layoutStyles["service-cta"]}>
            {t.directoryClosureCta}
          </Link>
        </aside>
      </div>
    </PageSection>
  );
}

async function VideoDirectoryEntries({ locale }: { locale: Locale }) {
  const entries = await fetchVideoEntries(locale);
  return <VideoDirectoryGrid entries={entries} locale={locale} />;
}

/** Test helper: render directory body without fetching. */
export function VideoDirectoryPageWithEntries({
  page,
  navigation = [],
  entries,
}: PageLayoutProps & { entries: VideoEntryDTO[] }) {
  const t = getPageStrings(page.locale);
  const appointmentHref = findAppointmentHref(navigation, page.locale);

  return (
    <PageSection rhythm="compact" entranceMotion="instant">
      <div className={layoutStyles["directory-page-stack"]}>
        <PageHeader page={page} kicker={null} heroImageVariant="accent" />
        <VideoDirectoryGrid entries={entries} locale={page.locale} />
        <aside className={layoutStyles["directory-closure"]} aria-label={t.directoryClosureCta}>
          <p>{t.directoryClosureCopy}</p>
          <Link href={appointmentHref} className={layoutStyles["service-cta"]}>
            {t.directoryClosureCta}
          </Link>
        </aside>
      </div>
    </PageSection>
  );
}
