import { MediaFrame } from "@/components/design-system";
import type { PageDTO } from "@/lib/cms/types";

export type PageLayoutProps = {
  page: PageDTO;
};

export function PageHeader({ page, kicker }: { page: PageDTO; kicker?: string }) {
  const media = page.imageCenter ?? page.featuredImage;

  return (
    <header className={`page-hero ${media ? "" : "page-hero--text-only"}`}>
      <div>
        <p className="kicker">{kicker ?? readableVariant(page.layoutVariant)}</p>
        <h1>{page.title}</h1>
        {page.excerpt ? <p className="excerpt">{page.excerpt}</p> : null}
        {page.tags.length > 0 ? (
          <ul className="tag-list" aria-label="Tags">
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
          priority
          variant="portrait"
        />
      ) : null}
    </header>
  );
}

function readableVariant(value: string): string {
  return value.replaceAll("-", " ");
}
