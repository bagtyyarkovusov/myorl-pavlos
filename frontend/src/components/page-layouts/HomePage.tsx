import { HomeHero } from "@/components/home/HomeHero";
import { HomeAdvantagesSection } from "@/components/home/HomeAdvantagesSection";
import { HomeTestimonialsTeaser } from "@/components/home/HomeTestimonialsTeaser";
import { HomeVisitMapSection } from "@/components/home/HomeVisitMapSection";
import { MenuAccessGrid } from "@/components/home/MenuAccessGrid";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getHomeRenderItemKey, orderHomeRenderItems } from "@/lib/home/home-render-order";
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
  const heroSection = page.sections.find((s) => s.__component === "sections.home-hero");
  const homeHero = heroSection?.__component === "sections.home-hero" ? heroSection : undefined;

  const heroMedia = homeHero?.media ?? page.imageCenter ?? page.featuredImage ?? null;
  const heroCtaHref = homeHero
    ? (homeHero.ctaUrl ??
      (homeHero.ctaTargetPage?.slug
        ? `/${page.locale}/${homeHero.ctaTargetPage.slug}`
        : appointmentHref))
    : appointmentHref;
  const heroCtaLabel = homeHero?.ctaLabel ?? "";
  const orderedItems = orderHomeRenderItems(
    page.sections.filter((s) => s.__component !== "sections.home-hero"),
  );

  return (
    <>
      <div data-locale={page.locale}>
        <HomeHero
          kicker={homeHero?.kicker ?? ""}
          title={homeHero?.heading ?? page.title}
          excerpt={homeHero?.intro ?? page.excerpt}
          media={heroMedia}
          ctaHref={heroCtaHref}
          ctaLabel={heroCtaLabel}
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
                  heading={item.section.heading}
                  intro={item.section.intro}
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
