import DOMPurify from "isomorphic-dompurify";
import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/cms/types";
import styles from "./ResultCard.module.css";

export type ResultCardProps = {
  title: string;
  excerpt: string;
  href: string;
  type: "page" | "video";
  thumbnail: string | null;
  parentTitle: string | null;
  parentSlug: string | null;
  locale: Locale;
  localePill?: Locale;
  onNavigate?: () => void;
};

const typeLabel: Record<Locale, Record<string, string>> = {
  el: { page: "Άρθρο", video: "Βίντεο" },
  ru: { page: "Статья", video: "Видео" },
};

export function ResultCard({
  title,
  excerpt,
  href,
  type,
  thumbnail,
  parentTitle,
  parentSlug,
  locale,
  localePill,
  onNavigate,
}: ResultCardProps) {
  const safeTitle = DOMPurify.sanitize(title, { ALLOWED_TAGS: ["em"] });
  const titleId = `result-${href.replace(/[^a-z0-9]+/gi, "-")}`;

  return (
    <article className={styles.card} aria-labelledby={titleId}>
      {thumbnail && (
        <Image
          src={thumbnail}
          alt=""
          width={120}
          height={90}
          className={styles.thumbnail}
          aria-hidden="true"
        />
      )}
      <div className={styles.body}>
        {parentTitle && parentSlug && (
          <nav className={styles.breadcrumb} aria-label="breadcrumb">
            <Link
              href={`/${locale}/${parentSlug}`}
              className={styles.breadcrumbLink}
              onNavigate={onNavigate}
            >
              {parentTitle}
            </Link>
            <span className={styles.breadcrumbSeparator} aria-hidden="true">
              {">"}
            </span>
          </nav>
        )}
        <h2 className={styles.title}>
          <Link
            id={titleId}
            href={href}
            className={styles.titleLink}
            onNavigate={onNavigate}
            dangerouslySetInnerHTML={{ __html: safeTitle }}
          />
        </h2>
        {excerpt && (
          <p className={styles.excerpt}>{DOMPurify.sanitize(excerpt, { ALLOWED_TAGS: ["em"] })}</p>
        )}
        <div className={styles.meta}>
          <span className={styles.typeChip}>{typeLabel[locale][type]}</span>
          {localePill && <span className={styles.localePill}>[{localePill}]</span>}
        </div>
      </div>
    </article>
  );
}
