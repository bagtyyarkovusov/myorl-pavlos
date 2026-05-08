import { CmsHtml } from "@/components/CmsHtml";
import { PageHero } from "@/components/PageHero";
import { PageSection } from "@/components/PageSection";
import { SectionTabBar } from "@/components/SectionTabBar";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import type { SectionDTO } from "@/lib/cms/types";
import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

export function StandardPage({ page, navigation = [] }: PageLayoutProps) {
  if (page.layoutVariant === "service-article") {
    return <ServiceArticlePage page={page} navigation={navigation} />;
  }

  if (
    page.layoutVariant === "encyclopedia-article" ||
    page.layoutVariant === "specialized-article"
  ) {
    return <ReferenceArticlePage page={page} navigation={navigation} />;
  }

  return (
    <PageSection>
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

function ReferenceArticlePage({ page, navigation = [] }: PageLayoutProps) {
  const variant = page.layoutVariant === "specialized-article" ? "specialized" : "encyclopedia";
  const headings = extractHeadings(page.content);
  const contentWithHeadingIds = addHeadingIds(page.content, headings);
  const relatedLinks = extractRelatedLinks(page.sections, page.locale);
  const bodySections = page.sections.filter(
    (section) => section.__component !== "sections.linked-resources",
  );

  return (
    <>
      <PageHero
        page={page}
        variant={variant === "specialized" ? "journal" : "compact"}
        breadcrumbs={buildBreadcrumbs(page)}
        metadata={buildArticleMetadata(page, variant)}
      />
      <SectionTabBar navigation={navigation} currentPage={page} />
      <main className={styles["reference-layout"]} data-article-layout={variant}>
        <article className={styles["reference-layout__content"]}>
          <CmsHtml html={contentWithHeadingIds} variant={variant} />
          {bodySections.map((section, index) => (
            <SectionRenderer
              key={`${section.__component}-${index}`}
              id={`section-${index + 1}`}
              section={section}
              index={index}
              density={variant === "encyclopedia" ? "scanning" : "focused"}
            />
          ))}
          {page.infoBlockBottom ? (
            <CmsHtml
              html={page.infoBlockBottom}
              className={styles["note-block"]}
              variant={variant}
            />
          ) : null}
        </article>
        <aside className={styles["reference-layout__sidebar"]}>
          {headings.length > 0 ? (
            <nav aria-label="Article contents" className={styles["reference-nav"]}>
              <p>Contents</p>
              {headings.map((heading) => (
                <a href={`#${heading.id}`} key={heading.id}>
                  {heading.text}
                </a>
              ))}
            </nav>
          ) : null}
          {variant === "specialized" && page.articleAuthor ? (
            <section className={styles["reference-panel"]} aria-label="Author">
              <p>Author</p>
              <strong>{page.articleAuthor}</strong>
            </section>
          ) : null}
          {relatedLinks.length > 0 ? (
            <section className={styles["reference-panel"]} aria-label="Related topics">
              <p>Related topics</p>
              {relatedLinks.map((link) => (
                <a href={link.href} key={`${link.href}-${link.label}`}>
                  {link.label}
                </a>
              ))}
            </section>
          ) : null}
          {page.sources ? (
            <section className={styles["reference-panel"]} aria-label="Sources">
              <p>Sources</p>
              <CmsHtml html={page.sources} variant={variant} />
            </section>
          ) : null}
        </aside>
      </main>
      <details className={styles["reference-mobile-panel"]}>
        <summary>Article details</summary>
        {headings.length > 0 ? (
          <nav aria-label="Article contents mobile">
            {headings.map((heading) => (
              <a href={`#${heading.id}`} key={heading.id}>
                {heading.text}
              </a>
            ))}
          </nav>
        ) : null}
      </details>
    </>
  );
}

function ServiceArticlePage({ page, navigation = [] }: PageLayoutProps) {
  const sectionLinks = page.sections
    .map((section, index) => ({
      id: `section-${index + 1}`,
      label: section.heading || section.__component.replace("sections.", ""),
    }))
    .filter((link) => link.label.trim().length > 0);

  return (
    <>
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

function buildArticleMetadata(
  page: PageLayoutProps["page"],
  variant: "encyclopedia" | "specialized",
): string[] {
  const metadata = [estimateReadingTime(page.content)];
  if (variant === "specialized") {
    if (page.articleAuthor) {
      metadata.push(page.articleAuthor);
    }
    if (page.sources) {
      metadata.push("Sources included");
    }
    return metadata;
  }
  metadata.push("Updated clinical review");
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

type HeadingLink = {
  id: string;
  text: string;
};

function extractHeadings(html?: string | null): HeadingLink[] {
  const matches = [...(html ?? "").matchAll(/<h([2-3])[^>]*>([\s\S]*?)<\/h\1>/gi)];
  const seen = new Map<string, number>();

  return matches.map((match) => {
    const text = stripTags(match[2] ?? "").trim();
    const baseId = slugify(text) || "section";
    const count = seen.get(baseId) ?? 0;
    seen.set(baseId, count + 1);
    return {
      id: count === 0 ? baseId : `${baseId}-${count + 1}`,
      text,
    };
  });
}

function addHeadingIds(
  html: string | null | undefined,
  headings: HeadingLink[],
): string | null | undefined {
  let index = 0;
  return html?.replace(/<h([2-3])([^>]*)>([\s\S]*?)<\/h\1>/gi, (match, level, attrs, body) => {
    const heading = headings[index];
    index += 1;
    if (!heading || /\sid=/i.test(attrs)) {
      return match;
    }
    return `<h${level}${attrs} id="${heading.id}">${body}</h${level}>`;
  });
}

function stripTags(value: string): string {
  return value.replace(/<[^>]*>/g, " ");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function extractRelatedLinks(sections: SectionDTO[], locale: string) {
  return sections.flatMap((section) => {
    if (section.__component !== "sections.linked-resources") {
      return [];
    }
    return section.items.map((item) => ({
      label: item.title || item.targetPage?.title || "Related topic",
      href: item.targetUrl || (item.targetPage?.slug ? `/${locale}/${item.targetPage.slug}` : "#"),
    }));
  });
}
