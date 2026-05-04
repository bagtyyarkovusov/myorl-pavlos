import { AppointmentPage } from "@/components/page-layouts/AppointmentPage";
import { ContactPage } from "@/components/page-layouts/ContactPage";
import { FrontendNativePage } from "@/components/page-layouts/FrontendNativePage";
import { GalleryPage } from "@/components/page-layouts/GalleryPage";
import { HomePage } from "@/components/page-layouts/HomePage";
import { QuestionListPage } from "@/components/page-layouts/QuestionListPage";
import { StandardPage } from "@/components/page-layouts/StandardPage";
import type { NavigationNodeDTO, PageDTO, GlobalSettingsDTO } from "@/lib/cms/types";
import type { HomeTestimonialsPayload } from "@/lib/testimonials/home-payload";

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

export function PageRenderer({
  page,
  appointmentHref,
  navigation = [],
  globalSettings,
  homeTestimonials = null,
  testimonialsPage = 1,
}: PageRendererProps) {
  if (page.renderMode === "frontend-native") {
    return <FrontendNativePage page={page} testimonialsPage={testimonialsPage} />;
  }

  if (page.layoutVariant === "appointment-form") {
    return <AppointmentPage page={page} />;
  }

  if (page.pageType === "home") {
    return (
      <HomePage
        page={page}
        appointmentHref={appointmentHref ?? `/${page.locale}`}
        navigation={navigation}
        settings={globalSettings ?? { locale: page.locale, address: null, phoneTel: null, phoneDisplay: null, hours: null }}
        homeTestimonials={homeTestimonials}
      />
    );
  }

  if (page.pageType === "faq" || page.pageType === "accordion" || page.pageType === "tabs") {
    return <QuestionListPage page={page} />;
  }

  if (page.pageType === "gallery") {
    return <GalleryPage page={page} />;
  }

  if (page.pageType === "contact") {
    return <ContactPage page={page} />;
  }

  return <StandardPage page={page} />;
}
