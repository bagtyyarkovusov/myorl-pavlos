import { PageSection } from "@/components/PageSection";
import { PageHeader, type PageLayoutProps } from "./_shared";
import { HumanSiteMapPage } from "./HumanSiteMapPage";
import { StandardPage } from "./StandardPage";
import { TestimonialsIndexPage } from "./TestimonialsIndexPage";
import type { NavigationNodeDTO } from "@/lib/cms/types";

type FrontendNativePageProps = PageLayoutProps & {
  testimonialsPage?: number;
  directoryNavigation?: NavigationNodeDTO[];
};

export function FrontendNativePage({
  page,
  testimonialsPage = 1,
  directoryNavigation = [],
}: FrontendNativePageProps) {
  if (page.layoutVariant === "search-results") {
    return (
      <PageSection rhythm="page">
        <PageHeader page={page} kicker="search" />
        <p>
          Search results are rendered by the Next.js frontend and do not depend on migrated Strapi
          body content.
        </p>
      </PageSection>
    );
  }

  if (page.layoutVariant === "sitemap") {
    return <HumanSiteMapPage page={page} directoryNavigation={directoryNavigation} />;
  }

  if (page.layoutVariant === "testimonials-index") {
    return <TestimonialsIndexPage page={page} currentPage={testimonialsPage} />;
  }

  return <StandardPage page={page} />;
}
