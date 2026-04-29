import { CmsHtml } from "@/components/CmsHtml";
import { PageSection } from "@/components/PageSection";
import type { SectionDTO } from "@/lib/cms/types";
import { PageHeader, type PageLayoutProps } from "./_shared";
import styles from "./_shared.module.css";

type QuestionEntry = { title: string; html: string | null };

export function QuestionListPage({ page }: PageLayoutProps) {
  const items = extractQuestionEntries(page.sections);

  return (
    <PageSection>
      <PageHeader page={page} />
      <CmsHtml html={page.content} />
      <div className={styles["card-list"]}>
        {items.map((item, index) => (
          <article className={styles["content-card"]} key={`${item.title}-${index}`}>
            <h2>{item.title || `Item ${index + 1}`}</h2>
            <CmsHtml html={item.html} />
          </article>
        ))}
      </div>
    </PageSection>
  );
}

function extractQuestionEntries(sections: SectionDTO[]): QuestionEntry[] {
  const first = sections[0];
  if (!first) {
    return [];
  }

  if (first.__component === "sections.faq") {
    return first.items.map((item) => ({
      title: item.question ?? "",
      html: item.answer ?? null,
    }));
  }

  if (first.__component === "sections.accordion") {
    return first.items.map((item) => ({
      title: item.title ?? "",
      html: item.content ?? null,
    }));
  }

  if (first.__component === "sections.tabs") {
    return first.items.map((item) => ({
      title: item.title ?? "",
      html: item.content ?? null,
    }));
  }

  return [];
}
