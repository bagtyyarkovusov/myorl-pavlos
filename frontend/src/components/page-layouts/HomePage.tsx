import { HomeHero } from "@/components/home/HomeHero";
import { HomeAdvantagesSection } from "@/components/home/HomeAdvantagesSection";
import { HomeTestimonialsTeaser } from "@/components/home/HomeTestimonialsTeaser";
import { HomeVisitMapSection } from "@/components/home/HomeVisitMapSection";
import { MenuAccessGrid } from "@/components/home/MenuAccessGrid";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getHomeRenderItemKey, orderHomeRenderItems } from "@/lib/home/home-render-order";
import { getHomeStrings } from "@/lib/i18n/home";
import type { GlobalSettingsDTO, NavigationNodeDTO } from "@/lib/cms/types";
import type { HomeTestimonialsPayload } from "@/lib/testimonials/home-payload";
import type { PageLayoutProps } from "./_shared";

type HomePageProps = PageLayoutProps & {
  appointmentHref: string;
  navigation: NavigationNodeDTO[];
  settings: GlobalSettingsDTO;
  homeTestimonials?: HomeTestimonialsPayload | null;
};

export function HomePage({
  page,
  appointmentHref,
  navigation,
  settings,
  homeTestimonials = null,
}: HomePageProps) {
  const t = getHomeStrings(page.locale);
  const heroMedia = page.imageCenter ?? page.featuredImage ?? null;
  const orderedItems = orderHomeRenderItems(page.sections);

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

        {orderedItems.map((item, index) => {
          switch (item.kind) {
            case "section":
              return (
                <SectionRenderer
                  key={getHomeRenderItemKey(item)}
                  context="home"
                  section={item.section}
                  locale={page.locale}
                  index={index}
                />
              );
            case "home-advantages":
              return (
                <HomeAdvantagesSection key={getHomeRenderItemKey(item)} section={item.section} />
              );
            case "menu-access-grid":
              return (
                <MenuAccessGrid
                  key={getHomeRenderItemKey(item)}
                  navigation={navigation}
                  locale={page.locale}
                />
              );
            case "home-testimonials":
              return homeTestimonials ? (
                <HomeTestimonialsTeaser
                  key={getHomeRenderItemKey(item)}
                  locale={page.locale}
                  payload={homeTestimonials}
                />
              ) : null;
            case "home-visit-map":
              return (
                <HomeVisitMapSection
                  key={getHomeRenderItemKey(item)}
                  locale={page.locale}
                  settings={settings}
                />
              );
          }
        })}
      </div>
    </>
  );
}
