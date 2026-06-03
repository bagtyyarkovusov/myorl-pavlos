import { PageHero } from "@/components/PageHero";
import { PageBody } from "./PageBody";
import { getPageStrings } from "@/lib/i18n/page";
import { defaultAppointmentHref } from "@/lib/navigation/appointment-href";
import { PageHeader, type PageLayoutProps } from "./_shared";

import layoutStyles from "./_shared.module.css";

export function StandardPage({ page, appointmentHref, disclaimerText }: PageLayoutProps) {
  if (page.layoutVariant === "service-article") {
    return (
      <ServiceArticlePage
        page={page}
        appointmentHref={appointmentHref}
        disclaimerText={disclaimerText}
      />
    );
  }

  if (
    page.layoutVariant === "encyclopedia-article" ||
    page.layoutVariant === "specialized-article"
  ) {
    return <ReferenceArticlePage page={page} disclaimerText={disclaimerText} />;
  }

  return (
    <div className={layoutStyles["page-shell"]}>
      <div className="container">
        <PageHeader page={page} />
        <PageBody page={page} disclaimerText={disclaimerText} />
      </div>
    </div>
  );
}

function ServiceArticlePage({ page, appointmentHref, disclaimerText }: PageLayoutProps) {
  const t = getPageStrings(page.locale);
  const bookHref = appointmentHref ?? defaultAppointmentHref(page.locale);

  return (
    <>
      <PageHero
        page={page}
        variant="cinematic"
        breadcrumbs={buildBreadcrumbs(page, t.home)}
        cta={{ label: t.bookConsultation, href: bookHref }}
      />
      <div className="container">
        <PageBody page={page} appointmentHref={bookHref} disclaimerText={disclaimerText} />
      </div>
    </>
  );
}

function ReferenceArticlePage({ page, disclaimerText }: PageLayoutProps) {
  const t = getPageStrings(page.locale);
  const variant = page.layoutVariant === "specialized-article" ? "specialized" : "encyclopedia";

  return (
    <>
      <PageHero
        page={page}
        variant={variant === "specialized" ? "journal" : "compact"}
        breadcrumbs={buildBreadcrumbs(page, t.home)}
        metadata={buildArticleMetadata(page, variant, t)}
      />
      <div className="container">
        <PageBody page={page} disclaimerText={disclaimerText} />
      </div>
    </>
  );
}

function buildBreadcrumbs(page: PageLayoutProps["page"], homeLabel: string) {
  const breadcrumbs = [{ label: homeLabel, href: `/${page.locale}` }];

  if (page.parentPage?.slug && page.parentPage.title) {
    breadcrumbs.push({
      label: page.parentPage.title,
      href: `/${page.locale}/${page.parentPage.slug}`,
    });
  }

  return breadcrumbs;
}

function buildArticleMetadata(
  page: PageLayoutProps["page"],
  variant: "encyclopedia" | "specialized",
  t: ReturnType<typeof getPageStrings>,
): string[] {
  const metadata = [estimateReadingTime(page.content)];
  if (variant === "specialized") {
    if (page.articleAuthor) {
      metadata.push(page.articleAuthor);
    }
    if (page.sources) {
      metadata.push(t.sourcesIncluded);
    }
    return metadata;
  }
  return metadata;
}

function estimateReadingTime(html?: string | null): string {
  const words = (html ?? "")
    .replace(/<[^>]*>/g, " ")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  return `${Math.max(1, Math.ceil(words / 220))} min read`;
}
