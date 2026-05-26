import dynamic from "next/dynamic";
import { AlternateUrlsSetter } from "@/components/AlternateUrlsSetter";
import { StructuredDataComposer } from "@/components/StructuredDataComposer";
import { VideoDirectoryPage } from "@/components/page-layouts/VideoDirectoryPage";
import { getSiteUrl } from "@/lib/cms/site-url";
import type { NavigationNodeDTO, PageDTO, GlobalSettingsDTO } from "@/lib/cms/types";
import { isSectionHubChild } from "@/lib/cms/tab-bar";
import type { HomeTestimonialsPayload } from "@/lib/testimonials/home-payload";

const DIRECTORY_LAYOUT_VARIANTS = new Set<PageDTO["layoutVariant"]>([
  "section-index",
  "clinic-index",
  "encyclopedia-index",
]);

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
const SectionHubPage = dynamic(() =>
  import("@/components/page-layouts/SectionHubPage").then((m) => m.SectionHubPage),
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
  /** Includes hidden pages so directory indexes can list CMS articles outside the header menu. */
  directoryNavigation?: NavigationNodeDTO[];
  /** Global Strapi single-type; used by the home visit/map band. */
  globalSettings?: GlobalSettingsDTO;
  /** Google / curated quotes for the home testimonials band (after the video section). */
  homeTestimonials?: HomeTestimonialsPayload | null;
  /** 1-based page index for `layoutVariant: testimonials-index` (query `?page=`). */
  testimonialsPage?: number;
  /** 1-based page index for URL-backed encyclopedia directory pagination. */
  directoryPage?: number;
  /** Active directory tag slug from the URL query. */
  directoryTag?: string | null;
  /** Canonical href for the current directory page, without query params. */
  directoryHref?: string;
};

export function PageRenderer({
  page,
  appointmentHref,
  navigation = [],
  directoryNavigation,
  globalSettings,
  homeTestimonials = null,
  testimonialsPage = 1,
  directoryPage = 1,
  directoryTag = null,
  directoryHref,
}: PageRendererProps) {
  const jsonLd = (
    <StructuredDataComposer
      page={page}
      siteUrl={getSiteUrl()}
      globalSettings={globalSettings}
      homeTestimonials={homeTestimonials}
    />
  );

  let layout: React.ReactNode;

  if (page.renderMode === "frontend-native") {
    layout = (
      <FrontendNativePage
        page={page}
        testimonialsPage={testimonialsPage}
        directoryNavigation={directoryNavigation ?? navigation}
      />
    );
  } else if (page.layoutVariant === "appointment-form") {
    layout = (
      <AppointmentPage
        page={page}
        settings={
          globalSettings ?? {
            locale: page.locale,
            address: null,
            phoneTel: null,
            phoneDisplay: null,
            secondaryPhoneTel: null,
            secondaryPhoneDisplay: null,
            email: null,
            hours: null,
            disclaimerText: null,
            socialLinks: [],
          }
        }
      />
    );
  } else if (page.layoutVariant === "video-index") {
    layout = (
      <VideoDirectoryPage
        page={page}
        navigation={directoryNavigation ?? navigation}
        appointmentHref={appointmentHref}
      />
    );
  } else if (DIRECTORY_LAYOUT_VARIANTS.has(page.layoutVariant)) {
    layout = (
      <SectionIndexPage
        page={page}
        navigation={directoryNavigation ?? navigation}
        appointmentHref={appointmentHref}
        currentPage={directoryPage}
        activeTagSlug={directoryTag}
        indexHref={directoryHref}
      />
    );
  } else if (page.layoutVariant === "section-hub" || isSectionHubChild(navigation, page)) {
    layout = <SectionHubPage page={page} navigation={navigation} />;
  } else if (page.pageType === "home") {
    layout = (
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
            secondaryPhoneTel: null,
            secondaryPhoneDisplay: null,
            email: null,
            hours: null,
            disclaimerText: null,
            socialLinks: [],
          }
        }
        homeTestimonials={homeTestimonials}
      />
    );
  } else if (page.pageType === "faq" || page.pageType === "accordion" || page.pageType === "tabs") {
    layout = (
      <QuestionListPage page={page} navigation={navigation} appointmentHref={appointmentHref} />
    );
  } else if (page.pageType === "gallery") {
    layout = <GalleryPage page={page} />;
  } else if (page.pageType === "contact") {
    layout = <ContactPage page={page} />;
  } else {
    layout = (
      <StandardPage
        page={page}
        appointmentHref={appointmentHref}
        disclaimerText={globalSettings?.disclaimerText}
      />
    );
  }

  return (
    <>
      <AlternateUrlsSetter urls={page.alternateUrls} />
      {jsonLd}
      {layout}
    </>
  );
}
