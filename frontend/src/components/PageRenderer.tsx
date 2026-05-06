import dynamic from "next/dynamic";
import { StructuredData } from "@/components/StructuredData";
import { getCmsConfig } from "@/lib/cms/env";
import { buildWebPageLd } from "@/lib/structured-data/webpage";
import { buildWebSiteLd } from "@/lib/structured-data/website";
import type { NavigationNodeDTO, PageDTO, GlobalSettingsDTO } from "@/lib/cms/types";
import type { HomeTestimonialsPayload } from "@/lib/testimonials/home-payload";

const AppointmentPage = dynamic(() =>
  import("@/components/page-layouts/AppointmentPage").then((m) => m.AppointmentPage),
);
const ContactPage = dynamic(() =>
  import("@/components/page-layouts/ContactPage").then((m) => m.ContactPage),
);
const FrontendNativePage = dynamic(() =>
  import("@/components/page-layouts/FrontendNativePage").then((m) => m.FrontendNativePage),
);
const GalleryPage = dynamic(() =>
  import("@/components/page-layouts/GalleryPage").then((m) => m.GalleryPage),
);
const HomePage = dynamic(() =>
  import("@/components/page-layouts/HomePage").then((m) => m.HomePage),
);
const QuestionListPage = dynamic(() =>
  import("@/components/page-layouts/QuestionListPage").then((m) => m.QuestionListPage),
);
const SectionIndexPage = dynamic(() =>
  import("@/components/page-layouts/SectionIndexPage").then((m) => m.SectionIndexPage),
);
const StandardPage = dynamic(() =>
  import("@/components/page-layouts/StandardPage").then((m) => m.StandardPage),
);

type PageRendererProps = {
  page: PageDTO;
  /** Resolved from navigation for home CTA; ignored for other layouts. */
  appointmentHref?: string;
  /** Server-fetched navigation used by home-only entry components. */
  navigation?: NavigationNodeDTO[];
  /** Global Strapi single-type; used by the home visit/map band. */
  globalSettings?: GlobalSettingsDTO;
  /** Google / curated quotes for the home testimonials band (after the video section). */
  homeTestimonials?: HomeTestimonialsPayload | null;
  /** 1-based page index for `layoutVariant: testimonials-index` (query `?page=`). */
  testimonialsPage?: number;
};

function PageJsonLd({ page }: { page: PageDTO }) {
  const config = getCmsConfig();
  const webSiteLd = buildWebSiteLd(config.siteUrl, "MyORL");
  const webPageLd = buildWebPageLd(page, config.siteUrl);
  return (
    <>
      <StructuredData data={webSiteLd} />
      <StructuredData data={webPageLd} />
    </>
  );
}

export function PageRenderer({
  page,
  appointmentHref,
  navigation = [],
  globalSettings,
  homeTestimonials = null,
  testimonialsPage = 1,
}: PageRendererProps) {
  const jsonLd = <PageJsonLd page={page} />;

  if (page.renderMode === "frontend-native") {
    return (
      <>
        {jsonLd}
        <FrontendNativePage page={page} testimonialsPage={testimonialsPage} />
      </>
    );
  }

  if (page.layoutVariant === "appointment-form") {
    return (
      <>
        {jsonLd}
        <AppointmentPage page={page} navigation={navigation} />
      </>
    );
  }

  if (page.layoutVariant === "section-index") {
    return (
      <>
        {jsonLd}
        <SectionIndexPage page={page} navigation={navigation} />
      </>
    );
  }

  if (page.pageType === "home") {
    return (
      <>
        {jsonLd}
        <HomePage
          page={page}
          appointmentHref={appointmentHref ?? `/${page.locale}`}
          navigation={navigation}
          settings={
            globalSettings ?? {
              locale: page.locale,
              address: null,
              phoneTel: null,
              phoneDisplay: null,
              hours: null,
            }
          }
          homeTestimonials={homeTestimonials}
        />
      </>
    );
  }

  if (page.pageType === "faq" || page.pageType === "accordion" || page.pageType === "tabs") {
    return (
      <>
        {jsonLd}
        <QuestionListPage page={page} navigation={navigation} />
      </>
    );
  }

  if (page.pageType === "gallery") {
    return (
      <>
        {jsonLd}
        <GalleryPage page={page} navigation={navigation} />
      </>
    );
  }

  if (page.pageType === "contact") {
    return (
      <>
        {jsonLd}
        <ContactPage page={page} navigation={navigation} />
      </>
    );
  }

  return (
    <>
      {jsonLd}
      <StandardPage page={page} navigation={navigation} />
    </>
  );
}
