import type { PageLayoutProps } from "./_shared";
import { HumanSiteMapPage } from "./HumanSiteMapPage";
import { SearchResultsHero } from "@/components/search/SearchResultsHero";
import { StandardPage } from "./StandardPage";
import { TestimonialsIndexPage } from "./TestimonialsIndexPage";
import type { NavigationNodeDTO } from "@/lib/cms/types";

type FrontendNativePageProps = PageLayoutProps & {
  directoryNavigation?: NavigationNodeDTO[];
};

export function FrontendNativePage({ page, directoryNavigation = [] }: FrontendNativePageProps) {
  if (page.layoutVariant === "sitemap") {
    return <HumanSiteMapPage page={page} directoryNavigation={directoryNavigation} />;
  }

  if (page.layoutVariant === "testimonials-index") {
    // No CMS pages currently use this layout. If/when one is created, the
    // ?page= query param needs to be plumbed via useSearchParams in a client
    // wrapper around TestimonialsIndexPage — matching the pattern used in
    // SectionIndexGrid.
    return <TestimonialsIndexPage page={page} currentPage={1} />;
  }

  if (page.layoutVariant === "search-results") {
    return <SearchResultsHero locale={page.locale} />;
  }

  return <StandardPage page={page} />;
}
