import { MediaFrame } from "@/components/design-system";
import type { PageDTO } from "@/lib/cms/types";

import styles from "./_shared.module.css";

export type PageLayoutProps = {
  page: PageDTO;
};

export function PageHeader({ page, kicker }: { page: PageDTO; kicker?: string | null }) {
  const media = page.imageCenter ?? page.featuredImage;
  const kickerText = kicker === null ? null : (kicker ?? readableVariant(page.layoutVariant));

  return (
    <header className={`${styles["page-hero"]} ${media ? "" : styles["page-hero--text-only"]}`}>
      <div>
        {kickerText ? (
          <p className="font-mono text-xs font-medium uppercase text-stone-soft">{kickerText}</p>
        ) : null}
        <h1>{page.title}</h1>
        {page.excerpt ? <p className={styles.excerpt}>{page.excerpt}</p> : null}
        {page.tags.length > 0 ? (
          <ul className={styles["tag-list"]} aria-label="Tags">
            {page.tags.map((tag) => (
              <li key={tag.slug}>{tag.name}</li>
            ))}
          </ul>
        ) : null}
      </div>
      {media ? (
        <MediaFrame
          media={media}
          alt={media.alternativeText ?? page.title}
          label="clinical content"
          eager
          variant="portrait"
        />
      ) : null}
    </header>
  );
}

function readableVariant(value: string): string {
  return value.replaceAll("-", " ");
}
