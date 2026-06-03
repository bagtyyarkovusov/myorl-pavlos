import dynamic from "next/dynamic";

import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import { getHomeStrings } from "@/lib/i18n/home";
import type { Locale, SectionDTO } from "@/lib/cms/types";

import { DefaultSectionRenderer } from "./DefaultSectionRenderer";

const HomePromoCarousel = dynamic(() =>
  import("@/components/home/HomePromoCarousel").then((m) => m.HomePromoCarousel),
);
const HomeVideoTheater = dynamic(() =>
  import("@/components/home/HomeVideoTheater").then((m) => m.HomeVideoTheater),
);
const HomeAdvantagesSection = dynamic(() =>
  import("@/components/home/HomeAdvantagesSection").then((m) => m.HomeAdvantagesSection),
);
const HomeMedicalGrid = dynamic(() =>
  import("@/components/home/HomeMedicalGrid").then((m) => m.HomeMedicalGrid),
);
const HomeResourceGroup = dynamic(() =>
  import("@/components/home/HomeResourceGroup").then((m) => m.HomeResourceGroup),
);

export function HomeSectionRenderer({
  section,
  locale,
  index,
}: {
  section: SectionDTO;
  locale: Locale;
  index?: number;
}) {
  const t = getHomeStrings(locale);

  switch (section.__component) {
    case "sections.promo-slider":
      return (
        <HomePromoCarousel
          title={section.heading ?? ""}
          intro={section.intro ?? ""}
          slides={section.slides}
          locale={locale}
          learnMoreLabel={t.learnMore}
        />
      );
    case "sections.advantages":
      return <HomeAdvantagesSection section={section} />;
    case "sections.home-resource-group":
      return <HomeResourceGroup section={section} locale={locale} learnMoreLabel={t.learnMore} />;
    case "sections.linked-resources":
      return (
        <HomeMedicalGrid
          items={section.items}
          locale={locale}
          learnMoreLabel={t.learnMore}
          viewAllLabel={t.viewAll}
        />
      );
    case "sections.video":
      return (
        <HomeVideoTheater
          title={section.heading ?? ""}
          intro={section.intro ?? ""}
          videos={section.videos}
          ctaLabel={t.videoCta}
          ctaHref={`/${locale}/video`}
        />
      );
    case "sections.home-notice":
      return section.heading || section.intro ? (
        <PageSection
          background="surface"
          heading={section.heading ? { title: section.heading } : undefined}
          sectionIndex={index}
          density="theater"
        >
          {section.intro ? <CmsHtml html={section.intro} /> : null}
        </PageSection>
      ) : null;
    case "sections.social-links":
    case "sections.contact":
      return null;
    default:
      return (
        <PageSection
          heading={
            section.heading || section.intro
              ? { title: section.heading ?? "", intro: section.intro ?? undefined }
              : undefined
          }
          rhythm="compact"
          sectionIndex={index}
          density="theater"
        >
          <DefaultSectionRenderer
            section={section}
            density="theater"
            locale={locale}
            sectionIndex={index}
          />
        </PageSection>
      );
  }
}
