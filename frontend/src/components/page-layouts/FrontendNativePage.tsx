import type { PageLayoutProps } from "./_shared";
import { HumanSiteMapPage } from "./HumanSiteMapPage";
import { SearchResultsHero } from "@/components/search/SearchResultsHero";
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
  if (page.layoutVariant === "sitemap") {
    return <HumanSiteMapPage page={page} directoryNavigation={directoryNavigation} />;
  }

  if (page.layoutVariant === "testimonials-index") {
    return <TestimonialsIndexPage page={page} currentPage={testimonialsPage} />;
  }

  if (page.layoutVariant === "search-results") {
    return <SearchResultsHero locale={page.locale} />;
  }

  return <StandardPage page={page} />;
}
