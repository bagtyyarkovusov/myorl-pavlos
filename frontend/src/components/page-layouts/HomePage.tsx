import { HomeHero } from "@/components/home/HomeHero";
import { HomeAdvantagesSection } from "@/components/home/HomeAdvantagesSection";
import { HomePromoCarousel } from "@/components/home/HomePromoCarousel";
import { HomeMedicalLedger } from "@/components/home/HomeMedicalLedger";
import { HomeVideoTheater } from "@/components/home/HomeVideoTheater";
import { HomeContactFooter } from "@/components/home/HomeContactFooter";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getHomeStrings } from "@/lib/i18n/home";
import type { PageDTO, SectionDTO } from "@/lib/cms/types";
import type { PageLayoutProps } from "./_shared";

type HomePageProps = PageLayoutProps & {
  appointmentHref: string;
};

export function HomePage({ page, appointmentHref }: HomePageProps) {
  const t = getHomeStrings(page.locale);

  const heroMedia = page.imageCenter ?? page.featuredImage ?? null;
  const heroTitle = getHomeHeroTitle(page);

  const advantagesSection = page.sections.find(
    (section): section is Extract<SectionDTO, { __component: "sections.advantages" }> =>
      section.__component === "sections.advantages",
  );

  const promoSection = page.sections.find(
    (section): section is Extract<SectionDTO, { __component: "sections.promo-slider" }> =>
      section.__component === "sections.promo-slider",
  );

  const linkedResourcesSection = page.sections.find(
    (section): section is Extract<SectionDTO, { __component: "sections.linked-resources" }> =>
      section.__component === "sections.linked-resources",
  );

  const videoSection = page.sections.find(
    (section): section is Extract<SectionDTO, { __component: "sections.video" }> =>
      section.__component === "sections.video",
  );

  const remainingSections = page.sections.filter(
    (section) =>
      section.__component !== "sections.linked-resources" &&
      section.__component !== "sections.promo-slider" &&
      section.__component !== "sections.advantages" &&
      section.__component !== "sections.video",
  );

  return (
    <main className="home-shell" data-locale={page.locale}>
      <HomeHero
        kicker={t.heroKicker}
        title={
          <>
            {heroTitle} <span className="accent">{t.heroHighlightWord}</span> {t.heroTagline}
          </>
        }
        excerpt={page.excerpt}
        media={heroMedia}
        yearsLabel={t.statYears}
        yearsValue={t.statYearsValue}
        langsLabel={t.statLangs}
        langsValue={t.statLangsValue}
      />

      {advantagesSection ? <HomeAdvantagesSection section={advantagesSection} /> : null}

      {promoSection ? (
        <HomePromoCarousel
          title={promoSection.heading || t.categoriesEyebrow}
          slides={promoSection.slides}
          locale={page.locale}
        />
      ) : null}

      {linkedResourcesSection ? (
        <HomeMedicalLedger
          title={linkedResourcesSection.heading || t.journalTitleLine1}
          items={linkedResourcesSection.items}
          locale={page.locale}
        />
      ) : null}

      {videoSection ? (
        <HomeVideoTheater
          title={videoSection.heading || t.videoTitleLine1}
          intro={videoSection.intro || t.videoBody}
          videos={videoSection.videos}
          ctaLabel={t.videoCta}
          ctaHref={`/${page.locale}/video`}
        />
      ) : null}

      <HomeContactFooter
        title="Ready to breathe better? Schedule your consultation."
        appointmentHref={appointmentHref}
        bookLabel="Book Appointment"
        callHref="tel:+302101234567"
        callLabel="Call Clinic"
      />

      {remainingSections.length > 0 ? (
        <div className="section-inner home-remaining">
          {remainingSections.map((section, index) => (
            <SectionRenderer
              key={`${section.__component}-${index}`}
              context="home"
              section={section}
            />
          ))}
        </div>
      ) : null}
    </main>
  );
}

function getHomeHeroTitle(page: PageDTO): string {
  const normalizedTitle = page.title.trim().toLowerCase();

  if (normalizedTitle !== "menu" && normalizedTitle !== "меню") {
    return page.title;
  }

  return page.locale === "ru" ? "ЛОР-забота в Афинах" : "Φροντίδα ωτορινολαρυγγική";
}
