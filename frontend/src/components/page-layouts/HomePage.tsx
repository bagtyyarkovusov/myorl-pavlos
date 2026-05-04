import { Fragment } from "react";
import { HomeHero } from "@/components/home/HomeHero";
import { HomeAdvantagesSection } from "@/components/home/HomeAdvantagesSection";
import { HomeContactFooter } from "@/components/home/HomeContactFooter";
import { MenuAccessGrid } from "@/components/home/MenuAccessGrid";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getHomeStrings } from "@/lib/i18n/home";
import type { NavigationNodeDTO, SectionDTO } from "@/lib/cms/types";
import type { PageLayoutProps } from "./_shared";

type HomePageProps = PageLayoutProps & {
  appointmentHref: string;
  navigation: NavigationNodeDTO[];
};

type AdvantagesSection = Extract<SectionDTO, { __component: "sections.advantages" }>;

export function HomePage({ page, appointmentHref, navigation }: HomePageProps) {
  const t = getHomeStrings(page.locale);
  const heroMedia = page.imageCenter ?? page.featuredImage ?? null;
  const firstPromoIndex = page.sections.findIndex(
    (section) => section.__component === "sections.promo-slider",
  );
  const advantagesSection = page.sections.find(
    (section): section is AdvantagesSection => section.__component === "sections.advantages",
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

        if (shouldRenderMenuAccess) {
          return (
            <Fragment key={`${section.__component}-${index}`}>
              <SectionRenderer context="home" section={section} locale={page.locale} />
              <MenuAccessGrid navigation={navigation} locale={page.locale} />
              {advantagesSection ? <HomeAdvantagesSection section={advantagesSection} /> : null}
            </Fragment>
          );
        }

        return (
          <Fragment key={`${section.__component}-${index}`}>
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
