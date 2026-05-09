import { HomeHero } from "@/components/home/HomeHero";
import { HomeTestimonialsTeaser } from "@/components/home/HomeTestimonialsTeaser";
import { HomeVisitMapSection } from "@/components/home/HomeVisitMapSection";
import { MenuAccessGrid } from "@/components/home/MenuAccessGrid";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getHomeStrings } from "@/lib/i18n/home";
import {
  sortHomeSections,
  INJECTED_MENU_ACCESS_GRID,
  INJECTED_TESTIMONIALS_TEASER,
  INJECTED_VISIT_MAP,
} from "@/lib/home/section-order";
import type { GlobalSettingsDTO, NavigationNodeDTO, SectionDTO } from "@/lib/cms/types";
import type { InjectedMarker } from "@/lib/home/section-order";
import type { HomeTestimonialsPayload } from "@/lib/testimonials/home-payload";
import type { PageLayoutProps } from "./_shared";

type HomePageProps = PageLayoutProps & {
  appointmentHref: string;
  navigation: NavigationNodeDTO[];
  settings: GlobalSettingsDTO;
  homeTestimonials?: HomeTestimonialsPayload | null;
};

function isInjected(entry: SectionDTO | InjectedMarker): entry is InjectedMarker {
  return "__injected" in entry;
}

export function HomePage({
  page,
  appointmentHref,
  navigation,
  settings,
  homeTestimonials = null,
}: HomePageProps) {
  const t = getHomeStrings(page.locale);
  const heroMedia = page.imageCenter ?? page.featuredImage ?? null;
  const sorted = sortHomeSections(page.sections);

  return (
    <>
      <div data-locale={page.locale}>
        <HomeHero
          kicker={t.heroKicker}
          title={t.heroTitle}
          excerpt={t.heroLead}
          media={heroMedia}
          ctaHref={appointmentHref}
          ctaLabel={t.heroCtaLabel}
        />

        {sorted.map((entry, index) => {
          if (isInjected(entry)) {
            switch (entry.__injected) {
              case INJECTED_MENU_ACCESS_GRID:
                return (
                  <MenuAccessGrid
                    key={entry.__injected}
                    navigation={navigation}
                    locale={page.locale}
                  />
                );
              case INJECTED_TESTIMONIALS_TEASER:
                return homeTestimonials ? (
                  <HomeTestimonialsTeaser
                    key={entry.__injected}
                    locale={page.locale}
                    payload={homeTestimonials}
                  />
                ) : null;
              case INJECTED_VISIT_MAP:
                return (
                  <HomeVisitMapSection
                    key={entry.__injected}
                    locale={page.locale}
                    settings={settings}
                  />
                );
            }
          }

          return (
            <SectionRenderer
              key={`${entry.__component}-${index}`}
              context="home"
              section={entry}
              locale={page.locale}
              index={index}
            />
          );
        })}
      </div>
    </>
  );
}
