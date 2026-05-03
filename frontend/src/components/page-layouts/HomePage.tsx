import { Fragment } from "react";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeContactFooter } from "@/components/home/HomeContactFooter";
import { MenuAccessGrid } from "@/components/home/MenuAccessGrid";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getHomeStrings } from "@/lib/i18n/home";
import type { NavigationNodeDTO } from "@/lib/cms/types";
import type { PageLayoutProps } from "./_shared";
import styles from "@/components/home/home.module.css";

type HomePageProps = PageLayoutProps & {
  appointmentHref: string;
  navigation: NavigationNodeDTO[];
};

export function HomePage({ page, appointmentHref, navigation }: HomePageProps) {
  const t = getHomeStrings(page.locale);
  const heroMedia = page.imageCenter ?? page.featuredImage ?? null;
  const firstPromoIndex = page.sections.findIndex(
    (section) => section.__component === "sections.promo-slider",
  );

  return (
    <main data-locale={page.locale}>
      <HomeHero
        kicker={t.heroKicker}
        title={t.heroTitle}
        excerpt={t.heroLead}
        media={heroMedia}
        ctaHref={appointmentHref}
        ctaLabel={t.heroCtaLabel}
      />

      {page.sections.map((section, index) => {
        const shouldRenderMenuAccess =
          section.__component === "sections.promo-slider" && index === firstPromoIndex;
        const isMedicalGrid = section.__component === "sections.linked-resources";
        const isVideoTheater = section.__component === "sections.video";

        const dividerBefore = isMedicalGrid || isVideoTheater ? (
          <div key={`divider-${index}`} className={styles["section-divider"]} aria-hidden="true" />
        ) : null;

        if (shouldRenderMenuAccess) {
          return (
            <Fragment key={`${section.__component}-${index}`}>
              {dividerBefore}
              <div className={styles["section-group"]}>
                <SectionRenderer context="home" section={section} locale={page.locale} />
                <MenuAccessGrid navigation={navigation} locale={page.locale} />
              </div>
            </Fragment>
          );
        }

        return (
          <Fragment key={`${section.__component}-${index}`}>
            {dividerBefore}
            <SectionRenderer context="home" section={section} locale={page.locale} />
          </Fragment>
        );
      })}

      <HomeContactFooter
        title={t.contactFooterTitle}
        appointmentHref={appointmentHref}
        bookLabel={t.contactFooterBookLabel}
        callHref={t.contactFooterCallHref}
        callLabel={t.contactFooterCallLabel}
      />
    </main>
  );
}
