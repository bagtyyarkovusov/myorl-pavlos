import { CmsHtml } from "@/components/CmsHtml";
import { ContactForm } from "@/components/contact/ContactForm";
import { ButtonLink } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import {
  cmsContentDuplicatesExcerpt,
  getAppointmentFormCopy,
  getAppointmentMessagePlaceholder,
  getAppointmentStrings,
} from "@/lib/i18n/appointment";
import { getHomeStrings } from "@/lib/i18n/home";
import type { GlobalSettingsDTO } from "@/lib/cms/types";
import {
  resolveContactEmail,
  resolvePhoneDisplay,
  resolvePhoneTel,
  resolveSecondaryPhoneDisplay,
  resolveSecondaryPhoneTel,
  resolveVisitAddressBlock,
  resolveVisitHours,
} from "@/lib/site/contact-fallbacks";

import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./AppointmentPage.module.css";

type AppointmentPageProps = PageLayoutProps & {
  settings?: GlobalSettingsDTO;
};

export function AppointmentPage({ page, settings }: AppointmentPageProps) {
  const t = getAppointmentStrings(page.locale);
  const home = getHomeStrings(page.locale);
  const resolvedSettings: GlobalSettingsDTO = settings ?? {
    locale: page.locale,
    address: null,
    phoneTel: null,
    phoneDisplay: null,
    secondaryPhoneTel: null,
    secondaryPhoneDisplay: null,
    email: null,
    hours: null,
    socialLinks: [],
  };

  const phoneTel = resolvePhoneTel(resolvedSettings);
  const secondaryPhoneTel = resolveSecondaryPhoneTel(resolvedSettings);
  const secondaryPhoneDisplay = resolveSecondaryPhoneDisplay(resolvedSettings);
  const email = resolveContactEmail(resolvedSettings);
  const hours = resolveVisitHours(resolvedSettings, page.locale);
  const address = resolveVisitAddressBlock(resolvedSettings, page.locale);
  const showCmsContent = page.content && !cmsContentDuplicatesExcerpt(page.content, page.excerpt);

  return (
    <PageSection rhythm="page">
      <PageHeader page={page} kicker={null} showExcerpt={false} showHeroImage={false} />
      {showCmsContent ? <CmsHtml html={page.content} className={styles.intro} /> : null}

      <div className={styles.booking}>
        <div className={styles.formColumn}>
          <ContactForm
            locale={page.locale}
            variant="appointment"
            copy={getAppointmentFormCopy(page.locale)}
            messagePlaceholder={getAppointmentMessagePlaceholder(page.locale)}
            appointmentStrings={t}
          />
        </div>

        <aside className={styles.sidebar} aria-label={t.quickContactLabel}>
          <h2 className={styles.sidebarTitle}>{t.quickContactLabel}</h2>
          <p className={styles.sidebarIntro}>{t.quickContactIntro}</p>

          {hours ? (
            <div className={styles.metaBlock}>
              <p className={styles.metaLabel}>{home.visitMapLabelHours}</p>
              <p className={styles.metaValue}>{hours}</p>
            </div>
          ) : null}

          {address ? (
            <div className={styles.metaBlock}>
              <p className={styles.metaLabel}>{home.visitMapLabelAddress}</p>
              <p className={styles.metaValue}>{address}</p>
            </div>
          ) : null}

          <div className={styles.actions}>
            {phoneTel ? (
              <ButtonLink href={`tel:${phoneTel}`} variant="primary">
                {t.callNowLabel}
              </ButtonLink>
            ) : null}
            {secondaryPhoneTel ? (
              <ButtonLink href={`tel:${secondaryPhoneTel}`} variant="secondary">
                {secondaryPhoneDisplay ?? secondaryPhoneTel}
              </ButtonLink>
            ) : null}
            {email ? (
              <ButtonLink href={`mailto:${email}`} variant="secondary">
                {t.emailActionLabel}
              </ButtonLink>
            ) : null}
          </div>
        </aside>
      </div>

      {page.sections.map((section, index) => (
        <SectionRenderer key={`${section.__component}-${index}`} section={section} index={index} />
      ))}
    </PageSection>
  );
}
