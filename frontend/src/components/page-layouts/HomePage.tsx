import { HomeHero } from "@/components/home/HomeHero";
import { HomeAdvantagesSection } from "@/components/home/HomeAdvantagesSection";
import { HomePromoCarousel } from "@/components/home/HomePromoCarousel";
import { HomeMedicalLedger } from "@/components/home/HomeMedicalLedger";
import { HomeMedicalGrid } from "@/components/home/HomeMedicalGrid";
import { HomeVideoTheater } from "@/components/home/HomeVideoTheater";
import { HomeContactFooter } from "@/components/home/HomeContactFooter";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { useHomeSections } from "@/lib/hooks/useHomeSections";
import { getHomeStrings } from "@/lib/i18n/home";
import type { PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

type HomePageProps = PageLayoutProps & {
  appointmentHref: string;
};

export function HomePage({ page, appointmentHref }: HomePageProps) {
  const t = getHomeStrings(page.locale);

  const heroMedia = page.imageCenter ?? page.featuredImage ?? null;

  const {
    advantagesSection,
    promoSection,
    linkedResourcesSection,
    videoSection,
    remainingSections,
  } = useHomeSections(page.sections);

  return (
    <main data-locale={page.locale}>
      <HomeHero
        kicker={t.heroKicker}
        title={t.heroTitle}
        excerpt={t.heroLead}
        media={heroMedia}
        ctaHref={appointmentHref}
        ctaLabel={t.heroCtaLabel}
        trustItems={t.heroTrustItems}
        mediaLabel={t.mediaLabelHero}
      />

      {promoSection ? (
        <HomePromoCarousel
          title={promoSection.heading || t.categoriesEyebrow}
          intro={promoSection.intro}
          slides={promoSection.slides}
          locale={page.locale}
          learnMoreLabel={t.learnMore}
        />
      ) : null}

      {advantagesSection ? <HomeAdvantagesSection section={advantagesSection} /> : null}

      {linkedResourcesSection ? (
        <>
          <HomeMedicalLedger
            title={linkedResourcesSection.heading || t.journalTitleLine1}
            items={linkedResourcesSection.items}
            locale={page.locale}
          />
          <HomeMedicalGrid
            title={
              linkedResourcesSection.heading
                ? `${linkedResourcesSection.heading} (grid)`
                : t.journalTitleLine1
            }
            items={linkedResourcesSection.items}
            locale={page.locale}
          />
        </>
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

      {remainingSections.length > 0 ? (
        <div className={styles["home-remaining"]}>
          {remainingSections.map((section, index) => (
            <SectionRenderer
              key={`${section.__component}-${index}`}
              context="home"
              section={section}
            />
          ))}
        </div>
      ) : null}

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
