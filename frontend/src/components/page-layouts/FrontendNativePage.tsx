import type { PageLayoutProps } from "./_shared";
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
  if (page.layoutVariant === "sitemap") {
    return <HumanSiteMapPage page={page} directoryNavigation={directoryNavigation} />;
  }

  if (page.layoutVariant === "testimonials-index") {
    return <TestimonialsIndexPage page={page} currentPage={testimonialsPage} />;
  }

  return <StandardPage page={page} />;
}
