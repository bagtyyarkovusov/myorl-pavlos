import { AppointmentPage } from "@/components/page-layouts/AppointmentPage";
import { ContactPage } from "@/components/page-layouts/ContactPage";
import { FrontendNativePage } from "@/components/page-layouts/FrontendNativePage";
import { GalleryPage } from "@/components/page-layouts/GalleryPage";
import { HomePage } from "@/components/page-layouts/HomePage";
import { QuestionListPage } from "@/components/page-layouts/QuestionListPage";
import { StandardPage } from "@/components/page-layouts/StandardPage";
import type { PageDTO } from "@/lib/cms/types";

type PageRendererProps = {
  page: PageDTO;
  /** Resolved from navigation for home CTA; ignored for other layouts. */
  appointmentHref?: string;
};

export function PageRenderer({ page, appointmentHref }: PageRendererProps) {
  if (page.renderMode === "frontend-native") {
    return <FrontendNativePage page={page} />;
  }

  if (page.layoutVariant === "appointment-form") {
    return <AppointmentPage page={page} />;
  }

  if (page.pageType === "home") {
    return <HomePage page={page} appointmentHref={appointmentHref ?? `/${page.locale}`} />;
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
