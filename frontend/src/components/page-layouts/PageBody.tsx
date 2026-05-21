import { CmsHtml } from "@/components/CmsHtml";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getPageStrings } from "@/lib/i18n/page";
import { cn } from "@/lib/utils";
import type { SectionDTO, PageDTO } from "@/lib/cms/types";
import styles from "./_shared.module.css";

type PageBodyProps = {
  page: PageDTO;
  /** Tighter vertical gaps between intro, CMS sections, and footers (section-hub pages). */
  proseStackGap?: "default" | "compact";
  /** When true, page sits under section-hub chrome (tab bar): tighter stacks and TOC scroll offsets. */
  hubChild?: boolean;
};

export function PageBody({ page, proseStackGap = "default", hubChild = false }: PageBodyProps) {
  if (page.layoutVariant === "service-article") {
    return <ServiceArticleBody page={page} hubChild={hubChild} />;
  }
  if (
    page.layoutVariant === "encyclopedia-article" ||
    page.layoutVariant === "specialized-article"
  ) {
    return <ReferenceArticleBody page={page} hubChild={hubChild} />;
  }
  return <DefaultPageBody page={page} proseStackGap={proseStackGap} />;
}

type DefaultPageBodyProps = {
  page: PageDTO;
  proseStackGap: "default" | "compact";
};

function DefaultPageBody({ page, proseStackGap }: DefaultPageBodyProps) {
  return (
    <div
      className={cn(
        styles["prose-shell"],
        proseStackGap === "compact" && styles["prose-shell--compact-stack"],
      )}
    >
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
    </div>
  );
}

function ServiceArticleBody({ page, hubChild = false }: PageBodyProps) {
  const t = getPageStrings(page.locale);
  const sectionLinks = page.sections
    .map((section, index) => ({
      id: `section-${index + 1}`,
      label: section.heading || section.__component.replace("sections.", ""),
    }))
    .filter((link) => link.label.trim().length > 0);

  const mobileSectionNav =
    sectionLinks.length > 0 ? (
      <details className={styles["service-mobile-panel"]}>
        <summary>{t.sections}</summary>
        <nav aria-label={t.sections}>
          {sectionLinks.map((link) => (
            <a href={`#${link.id}`} key={link.id}>
              {link.label}
            </a>
          ))}
        </nav>
      </details>
    ) : null;

  return (
    <>
      {mobileSectionNav}
      <main
        className={styles["service-layout"]}
        data-hub-child={hubChild ? "true" : undefined}
        data-service-layout="true"
      >
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
            <nav aria-label={t.sections} className={styles["service-nav"]}>
              <p>{t.sections}</p>
              {sectionLinks.map((link) => (
                <a href={`#${link.id}`} key={link.id}>
                  {link.label}
                </a>
              ))}
            </nav>
          ) : null}
        </aside>
      </main>
      <a className={styles["service-cta-mobile"]} href={`/${page.locale}/appointment`}>
        {t.bookConsultation}
      </a>
    </>
  );
}

function ReferenceArticleBody({ page, hubChild = false }: PageBodyProps) {
  const t = getPageStrings(page.locale);
  const variant = page.layoutVariant === "specialized-article" ? "specialized" : "encyclopedia";
  const headings = extractHeadings(page.content);
  const contentWithHeadingIds = addHeadingIds(page.content, headings);
  const relatedLinks = extractRelatedLinks(page.sections, page.locale);
  const bodySections = page.sections.filter(
    (section) => section.__component !== "sections.linked-resources",
  );

  const mobileToc =
    headings.length > 0 ? (
      <details className={styles["reference-mobile-panel"]}>
        <summary>{t.contents}</summary>
        <nav aria-label={t.contents}>
          {headings.map((heading) => (
            <a href={`#${heading.id}`} key={heading.id}>
              {heading.text}
            </a>
          ))}
        </nav>
      </details>
    ) : null;

  return (
    <>
      {mobileToc}
      <main
        className={styles["reference-layout"]}
        data-article-layout={variant}
        data-hub-child={hubChild ? "true" : undefined}
      >
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
          {page.sources ? (
            <section className={styles["sources-footer"]} aria-label={t.sources}>
              <p className={styles["sources-footer__label"]}>{t.sources}</p>
              <CmsHtml html={page.sources} className={styles["sources-block"]} variant={variant} />
            </section>
          ) : null}
        </article>
        <aside className={styles["reference-layout__sidebar"]}>
          {headings.length > 0 ? (
            <nav aria-label={t.contents} className={styles["reference-nav"]}>
              <p>{t.contents}</p>
              {headings.map((heading) => (
                <a href={`#${heading.id}`} key={heading.id}>
                  {heading.text}
                </a>
              ))}
            </nav>
          ) : null}
          {variant === "specialized" && page.articleAuthor ? (
            <section className={styles["reference-panel"]} aria-label={t.author}>
              <p>{t.author}</p>
              <strong>{page.articleAuthor}</strong>
            </section>
          ) : null}
          {relatedLinks.length > 0 ? (
            <section className={styles["reference-panel"]} aria-label={t.relatedTopics}>
              <p>{t.relatedTopics}</p>
              {relatedLinks.map((link) => (
                <a href={link.href} key={`${link.href}-${link.label}`}>
                  {link.label}
                </a>
              ))}
            </section>
          ) : null}
        </aside>
      </main>
    </>
  );
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

export { extractHeadings, addHeadingIds, slugify, stripTags, extractRelatedLinks };
export type { HeadingLink };
