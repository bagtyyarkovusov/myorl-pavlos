import type { PageDTO } from "@/lib/cms/types";

export type PageLayoutProps = {
  page: PageDTO;
};

export function PageHeader({ page, kicker }: { page: PageDTO; kicker?: string }) {
  return (
    <header className="page-hero">
      <p className="kicker">{kicker ?? page.layoutVariant}</p>
      <h1>{page.title}</h1>
      {page.excerpt ? <p className="excerpt">{page.excerpt}</p> : null}
      {page.tags.length > 0 ? (
        <ul className="tag-list" aria-label="Tags">
          {page.tags.map((tag) => (
            <li key={tag.slug}>{tag.name}</li>
          ))}
        </ul>
      ) : null}
    </header>
  );
}
