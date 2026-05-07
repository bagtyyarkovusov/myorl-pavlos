import { CmsHtml } from "@/components/CmsHtml";
import { PageHero } from "@/components/PageHero";
import { PageSection } from "@/components/PageSection";
import { SectionTabBar } from "@/components/SectionTabBar";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { StructuredData } from "@/components/StructuredData";
import { buildPageBreadcrumbLd } from "@/lib/structured-data/page-breadcrumbs";
import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

export function StandardPage({ page, navigation = [] }: PageLayoutProps) {
  const breadcrumbLd = buildPageBreadcrumbLd(page);

  if (page.layoutVariant === "service-article") {
    return <ServiceArticlePage page={page} navigation={navigation} breadcrumbLd={breadcrumbLd} />;
  }

  return (
    <PageSection>
      {breadcrumbLd ? <StructuredData data={breadcrumbLd} /> : null}
      <PageHeader page={page} />
      <SectionTabBar navigation={navigation} currentPage={page} />
      <CmsHtml html={page.content} />
      {page.sections.map((section, index) => (
        <SectionRenderer key={`${section.__component}-${index}`} section={section} index={index} />
      ))}
      {page.infoBlockBottom ? (
        <CmsHtml html={page.infoBlockBottom} className={`cms-html ${styles["note-block"]}`} />
      ) : null}
      {page.sources ? (
        <CmsHtml html={page.sources} className={`cms-html ${styles["sources-block"]}`} />
      ) : null}
    </PageSection>
  );
}

function ServiceArticlePage({
  page,
  navigation = [],
  breadcrumbLd,
}: PageLayoutProps & { breadcrumbLd: ReturnType<typeof buildPageBreadcrumbLd> }) {
  const sectionLinks = page.sections
    .map((section, index) => ({
      id: `section-${index + 1}`,
      label: section.heading || section.__component.replace("sections.", ""),
    }))
    .filter((link) => link.label.trim().length > 0);

  return (
    <>
      {breadcrumbLd ? <StructuredData data={breadcrumbLd} /> : null}
      <PageHero
        page={page}
        variant="cinematic"
        breadcrumbs={buildBreadcrumbs(page)}
        cta={{ label: "Book consultation", href: `/${page.locale}/appointment` }}
      />
      <SectionTabBar navigation={navigation} currentPage={page} />
      <main className={styles["service-layout"]} data-service-layout="true">
        <article className={styles["service-layout__content"]}>
          <CmsHtml html={page.content} variant="service" />
          {page.sections.map((section, index) => (
            <SectionRenderer
              key={`${section.__component}-${index}`}
              id={`section-${index + 1}`}
              section={section}
              index={index}
            />
          ))}
          {page.infoBlockBottom ? (
            <CmsHtml
              html={page.infoBlockBottom}
              className={styles["note-block"]}
              variant="service"
            />
          ) : null}
          {page.sources ? (
            <CmsHtml html={page.sources} className={styles["sources-block"]} variant="service" />
          ) : null}
        </article>
        <aside className={styles["service-layout__sidebar"]}>
          {sectionLinks.length > 0 ? (
            <nav aria-label="Article sections" className={styles["service-nav"]}>
              <p>Sections</p>
              {sectionLinks.map((link) => (
                <a href={`#${link.id}`} key={link.id}>
                  {link.label}
                </a>
              ))}
            </nav>
          ) : null}
          <a className={styles["service-cta"]} href={`/${page.locale}/appointment`}>
            Book consultation
          </a>
        </aside>
      </main>
      <a className={styles["service-cta-mobile"]} href={`/${page.locale}/appointment`}>
        Book consultation
      </a>
    </>
  );
}

function buildBreadcrumbs(page: PageLayoutProps["page"]) {
  const breadcrumbs = [{ label: "Home", href: `/${page.locale}` }];

  if (page.parentPage?.slug && page.parentPage.title) {
    breadcrumbs.push({
      label: page.parentPage.title,
      href: `/${page.locale}/${page.parentPage.slug}`,
    });
  }

  return breadcrumbs;
}
