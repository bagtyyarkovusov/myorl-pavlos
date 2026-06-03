import { ArticleDisclaimer } from "@/components/ArticleDisclaimer";
import { CmsHtml } from "@/components/CmsHtml";
import { MediaFrame } from "@/components/design-system";
import { SectionRenderer } from "@/components/sections/SectionRenderer";
import { getPageStrings } from "@/lib/i18n/page";
import { hrefForLocaleSlug } from "@/lib/cms/navigation";
import { defaultAppointmentHref } from "@/lib/navigation/appointment-href";
import { isBiographyPage } from "@/lib/cms/dense-pages";
import type { PageRefDTO, PageDTO, LayoutVariant } from "@/lib/cms/types";
import { cn } from "@/lib/utils";
import styles from "./_shared.module.css";

const MEDICAL_LAYOUT_VARIANTS: ReadonlySet<LayoutVariant> = new Set([
  "encyclopedia-article",
  "service-article",
  "service-faq",
  "service-accordion",
  "service-tabs",
  "specialized-article",
]);

function shouldShowDisclaimer(
  page: PageDTO,
  disclaimerText?: string | null,
): disclaimerText is string {
  if (!disclaimerText) return false;
  if (page.disclaimerOverride === "force-hide") return false;
  if (page.disclaimerOverride === "force-show") return true;
  return MEDICAL_LAYOUT_VARIANTS.has(page.layoutVariant);
}

type PageBodyProps = {
  page: PageDTO;
  /** Resolved book-appointment URL for service-article mobile CTA. */
  appointmentHref?: string;
  /** Tighter vertical gaps between intro, CMS sections, and footers (section-hub pages). */
  proseStackGap?: "default" | "compact";
  /** When true, page sits under section-hub chrome (tab bar): tighter stacks and TOC scroll offsets. */
  hubChild?: boolean;
  /** Medical disclaimer text from Global Settings. Rendered when applicable. */
  disclaimerText?: string | null;
};

export function PageBody({
  page,
  appointmentHref,
  proseStackGap = "default",
  hubChild = false,
  disclaimerText,
}: PageBodyProps) {
  if (page.layoutVariant === "service-article") {
    return (
      <ServiceArticleBody
        page={page}
        hubChild={hubChild}
        appointmentHref={appointmentHref}
        disclaimerText={disclaimerText}
      />
    );
  }
  if (
    page.layoutVariant === "encyclopedia-article" ||
    page.layoutVariant === "specialized-article"
  ) {
    return <ReferenceArticleBody page={page} hubChild={hubChild} disclaimerText={disclaimerText} />;
  }
  return (
    <DefaultPageBody
      page={page}
      proseStackGap={proseStackGap}
      hubChild={hubChild}
      disclaimerText={disclaimerText}
    />
  );
}

type DefaultPageBodyProps = {
  page: PageDTO;
  proseStackGap: "default" | "compact";
  hubChild?: boolean;
  disclaimerText?: string | null;
};

function hasProseAside(page: PageDTO): boolean {
  return page.relatedTopics.length > 0 || extractHeadings(page.content).length > 0;
}

function DefaultPageBody({
  page,
  proseStackGap,
  hubChild = false,
  disclaimerText,
}: DefaultPageBodyProps) {
  const isDense = isBiographyPage(page);
  const cmsVariant = isDense ? "dense" : "luxury";

  if (hasProseAside(page)) {
    return (
      <ArticleAsideBody
        page={page}
        hubChild={hubChild}
        cmsVariant={cmsVariant}
        sectionDensity="focused"
        layoutAttribute="data-prose-layout"
        layoutValue={isDense ? "dense" : "standard"}
        showAuthor={false}
        disclaimerText={disclaimerText}
      />
    );
  }

  return (
    <div
      className={cn(
        styles["prose-shell"],
        proseStackGap === "compact" && styles["prose-shell--compact-stack"],
      )}
    >
      <CmsHtml html={page.content} variant={cmsVariant} locale={page.locale} />
      {page.sections.map((section, index) => (
        <SectionRenderer key={`${section.__component}-${index}`} section={section} index={index} />
      ))}
      {page.infoBlockBottom ? (
        <CmsHtml
          html={page.infoBlockBottom}
          className={`cms-html ${styles["note-block"]}`}
          variant={cmsVariant}
          locale={page.locale}
        />
      ) : null}
      {page.sources ? (
        <CmsHtml
          html={page.sources}
          className={`cms-html ${styles["sources-block"]}`}
          variant={cmsVariant}
          locale={page.locale}
        />
      ) : null}
      {shouldShowDisclaimer(page, disclaimerText) ? (
        <ArticleDisclaimer disclaimerText={disclaimerText} locale={page.locale} />
      ) : null}
    </div>
  );
}

function ServiceArticleBody({
  page,
  hubChild = false,
  appointmentHref,
  disclaimerText,
}: PageBodyProps) {
  const t = getPageStrings(page.locale);
  const bookHref = appointmentHref ?? defaultAppointmentHref(page.locale);
  const linkedResourceRefs = extractLinkedResourceRefs(page.sections);
  const relatedTopics = mergeUniqueRefs(page.relatedTopics, linkedResourceRefs);
  const bodySections = page.sections.filter(
    (section) => section.__component !== "sections.linked-resources",
  );
  const sectionLinks = bodySections
    .map((section, index) => ({
      id: `section-${index + 1}`,
      label: section.heading || section.__component.replace("sections.", ""),
    }))
    .filter((link) => link.label.trim().length > 0);

  const contentHeadings = sectionLinks.length === 0 ? extractHeadings(page.content) : [];
  const mainContentHtml =
    contentHeadings.length > 0 ? addHeadingIds(page.content, contentHeadings) : page.content;

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

  const mobileContentToc =
    contentHeadings.length > 0 ? (
      <details className={styles["reference-mobile-panel"]}>
        <summary>{t.contents}</summary>
        <nav aria-label={t.contents}>
          {contentHeadings.map((heading) => (
            <a href={`#${heading.id}`} key={heading.id}>
              {heading.text}
            </a>
          ))}
        </nav>
      </details>
    ) : null;

  const mobileRelatedTopics =
    relatedTopics.length > 0 ? (
      <RelatedTopicsMobilePanel
        locale={page.locale}
        topics={relatedTopics}
        label={t.relatedTopics}
      />
    ) : null;

  return (
    <>
      {mobileSectionNav}
      {mobileContentToc}
      {mobileRelatedTopics}
      <main
        className={styles["service-layout"]}
        data-hub-child={hubChild ? "true" : undefined}
        data-service-layout="true"
      >
        <article className={styles["service-layout__content"]}>
          <CmsHtml html={mainContentHtml} variant="service" locale={page.locale} />
          {bodySections.map((section, index) => (
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
              locale={page.locale}
            />
          ) : null}
          {page.sources ? (
            <CmsHtml
              html={page.sources}
              className={styles["sources-block"]}
              variant="service"
              locale={page.locale}
            />
          ) : null}
          {shouldShowDisclaimer(page, disclaimerText) ? (
            <ArticleDisclaimer disclaimerText={disclaimerText} locale={page.locale} />
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
          {contentHeadings.length > 0 ? (
            <nav aria-label={t.contents} className={styles["reference-nav"]}>
              <p>{t.contents}</p>
              {contentHeadings.map((heading) => (
                <a href={`#${heading.id}`} key={heading.id}>
                  {heading.text}
                </a>
              ))}
            </nav>
          ) : null}
          {relatedTopics.length > 0 ? (
            <RelatedTopicsPanel
              locale={page.locale}
              topics={relatedTopics}
              label={t.relatedTopics}
            />
          ) : null}
        </aside>
      </main>
      <a className={styles["service-cta-mobile"]} href={bookHref}>
        {t.bookConsultation}
      </a>
    </>
  );
}

function ReferenceArticleBody({ page, hubChild = false, disclaimerText }: PageBodyProps) {
  const variant = page.layoutVariant === "specialized-article" ? "specialized" : "encyclopedia";

  return (
    <ArticleAsideBody
      page={page}
      hubChild={hubChild}
      cmsVariant={variant}
      sectionDensity={variant === "encyclopedia" ? "scanning" : "focused"}
      layoutAttribute="data-article-layout"
      layoutValue={variant}
      showAuthor={variant === "specialized"}
      disclaimerText={disclaimerText}
    />
  );
}

type ArticleAsideBodyProps = {
  page: PageDTO;
  hubChild?: boolean;
  cmsVariant: "luxury" | "encyclopedia" | "specialized" | "dense";
  sectionDensity: "scanning" | "focused";
  layoutAttribute: "data-article-layout" | "data-prose-layout";
  layoutValue: string;
  showAuthor: boolean;
  disclaimerText?: string | null;
};

/** Extracts target pages from linked-resources sections for use as Related Topics. */
function extractLinkedResourceRefs(sections: PageDTO["sections"]): PageRefDTO[] {
  const refs: PageRefDTO[] = [];
  for (const section of sections) {
    if (section.__component !== "sections.linked-resources") continue;
    for (const item of section.items) {
      if (item.targetPage?.documentId) {
        refs.push(item.targetPage);
      }
    }
  }
  return refs;
}

function mergeUniqueRefs(existing: PageRefDTO[], incoming: PageRefDTO[]): PageRefDTO[] {
  const seen = new Set(existing.map((r) => r.documentId));
  const merged = [...existing];
  for (const ref of incoming) {
    if (!seen.has(ref.documentId)) {
      seen.add(ref.documentId);
      merged.push(ref);
    }
  }
  return merged;
}

function ArticleAsideBody({
  page,
  hubChild = false,
  cmsVariant,
  sectionDensity,
  layoutAttribute,
  layoutValue,
  showAuthor,
  disclaimerText,
}: ArticleAsideBodyProps) {
  const t = getPageStrings(page.locale);
  const headings = extractHeadings(page.content);
  const contentWithHeadingIds = addHeadingIds(page.content, headings);
  const bodySections = page.sections.filter(
    (section) => section.__component !== "sections.linked-resources",
  );
  const linkedResourceRefs = extractLinkedResourceRefs(page.sections);
  const relatedTopics = mergeUniqueRefs(page.relatedTopics, linkedResourceRefs);

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

  const mobileRelatedTopics =
    relatedTopics.length > 0 ? (
      <RelatedTopicsMobilePanel
        locale={page.locale}
        topics={relatedTopics}
        label={t.relatedTopics}
      />
    ) : null;

  const layoutProps = {
    [layoutAttribute]: layoutValue,
    "data-hub-child": hubChild ? "true" : undefined,
  };

  return (
    <>
      {mobileToc}
      {mobileRelatedTopics}
      <main className={styles["reference-layout"]} {...layoutProps}>
        <article className={styles["reference-layout__content"]}>
          <CmsHtml html={contentWithHeadingIds} variant={cmsVariant} locale={page.locale} />
          {bodySections.map((section, index) => (
            <SectionRenderer
              key={`${section.__component}-${index}`}
              id={`section-${index + 1}`}
              section={section}
              index={index}
              density={sectionDensity}
            />
          ))}
          {page.infoBlockBottom ? (
            <CmsHtml
              html={page.infoBlockBottom}
              className={styles["note-block"]}
              variant={cmsVariant}
              locale={page.locale}
            />
          ) : null}
          {page.sources ? (
            <section className={styles["sources-footer"]} aria-label={t.sources}>
              <p className={styles["sources-footer__label"]}>{t.sources}</p>
              <CmsHtml
                html={page.sources}
                className={styles["sources-block"]}
                variant={cmsVariant}
                locale={page.locale}
              />
            </section>
          ) : null}
          {shouldShowDisclaimer(page, disclaimerText) ? (
            <ArticleDisclaimer disclaimerText={disclaimerText} locale={page.locale} />
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
          {showAuthor && page.articleAuthor ? (
            <section className={styles["reference-panel"]} aria-label={t.author}>
              <p>{t.author}</p>
              <strong>{page.articleAuthor}</strong>
            </section>
          ) : null}
          {relatedTopics.length > 0 ? (
            <RelatedTopicsPanel
              locale={page.locale}
              topics={relatedTopics}
              label={t.relatedTopics}
            />
          ) : null}
        </aside>
      </main>
    </>
  );
}

type RelatedTopicsPanelProps = {
  locale: PageDTO["locale"];
  topics: PageRefDTO[];
  label: string;
};

function RelatedTopicsPanel({ locale, topics, label }: RelatedTopicsPanelProps) {
  return (
    <section className={styles["related-topics-panel"]} aria-labelledby="related-topics-heading">
      <p id="related-topics-heading">{label}</p>
      <nav>
        {topics.map((topic) => (
          <RelatedTopicLink key={topic.documentId} locale={locale} topic={topic} />
        ))}
      </nav>
    </section>
  );
}

function RelatedTopicsMobilePanel({ locale, topics, label }: RelatedTopicsPanelProps) {
  return (
    <details
      className={`${styles["reference-mobile-panel"]} ${styles["related-topics-mobile-panel"]}`}
    >
      <summary>{label}</summary>
      <nav aria-label={label}>
        {topics.map((topic) => (
          <RelatedTopicLink key={topic.documentId} locale={locale} topic={topic} />
        ))}
      </nav>
    </details>
  );
}

function RelatedTopicLink({ locale, topic }: { locale: PageDTO["locale"]; topic: PageRefDTO }) {
  const title = topic.title || "Related topic";
  const media = topic.featuredImage;
  const hasImage = Boolean(media?.url);

  return (
    <a
      href={relatedTopicHref(topic, locale)}
      className={styles["related-topics-panel__link"]}
      data-has-image={hasImage ? "true" : undefined}
      lang={locale}
    >
      {hasImage ? (
        <span className={styles["related-topics-panel__thumb"]}>
          <MediaFrame
            media={media}
            alt={media?.alternativeText || title}
            variant="wide"
            className={styles["related-topics-panel__frame"]}
            sizes="72px"
          />
        </span>
      ) : null}
      <span className={styles["related-topics-panel__title"]}>{title}</span>
    </a>
  );
}

function relatedTopicHref(topic: PageRefDTO, locale: PageDTO["locale"]): string {
  if (!topic.slug) return "#";
  return hrefForLocaleSlug(locale, topic.slug);
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

export { extractHeadings, addHeadingIds, slugify, stripTags, relatedTopicHref };
export type { HeadingLink };
