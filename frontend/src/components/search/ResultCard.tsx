import DOMPurify from "isomorphic-dompurify";
import Image from "next/image";
import Link from "next/link";
import type { Locale } from "@/lib/cms/types";

export type ResultCardProps = {
  title: string;
  excerpt: string;
  href: string;
  type: "page" | "video";
  thumbnail: string | null;
  parentTitle: string | null;
  parentSlug: string | null;
  locale: Locale;
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
}: ResultCardProps) {
  const safeTitle = DOMPurify.sanitize(title, { ALLOWED_TAGS: ["em"] });

  return (
    <article>
      {thumbnail && (
        <Image src={thumbnail} alt="" width={120} height={90} style={{ objectFit: "cover" }} />
      )}
      <div>
        {parentTitle && parentSlug && (
          <nav aria-label="breadcrumb">
            <Link href={`/${locale}/${parentSlug}`}>{parentTitle}</Link>
            {" > "}
          </nav>
        )}
        <h2>
          <Link href={href} dangerouslySetInnerHTML={{ __html: safeTitle }} />
        </h2>
        {excerpt && <p>{DOMPurify.sanitize(excerpt)}</p>}
        <span>{typeLabel[locale][type]}</span>
      </div>
    </article>
  );
}
