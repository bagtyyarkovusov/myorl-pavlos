import { HomeHero } from "@/components/home/HomeHero";
import { HomeContactFooter } from "@/components/home/HomeContactFooter";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getHomeStrings } from "@/lib/i18n/home";
import type { PageLayoutProps } from "./_shared";

type HomePageProps = PageLayoutProps & {
  appointmentHref: string;
};

export function HomePage({ page, appointmentHref }: HomePageProps) {
  const t = getHomeStrings(page.locale);

  const heroMedia = page.imageCenter ?? page.featuredImage ?? null;

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

      {page.sections.map((section, index) => (
        <SectionRenderer
          key={`${section.__component}-${index}`}
          context="home"
          section={section}
          locale={page.locale}
        />
      ))}

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
