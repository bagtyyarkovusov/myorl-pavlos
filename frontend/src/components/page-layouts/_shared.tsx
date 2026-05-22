import { MediaFrame } from "@/components/design-system";
import type { NavigationNodeDTO, PageDTO } from "@/lib/cms/types";
import { getPageStrings } from "@/lib/i18n/page";
import { cn } from "@/lib/utils";
import Link from "next/link";

import styles from "./_shared.module.css";

export type PageLayoutProps = {
  page: PageDTO;
  navigation?: NavigationNodeDTO[];
  appointmentHref?: string;
};

export function PageHeader({
  page,
  kicker,
  breadcrumbsEnabled = true,
  heroImageVariant = "default",
  showExcerpt = true,
  showHeroImage = true,
}: {
  page: PageDTO;
  kicker?: string | null;
  /** When true, renders Home / Parent crumb links when `parentPage` is set (same trail as article heroes). */
  breadcrumbsEnabled?: boolean;
  /** `accent` — compact band under the title on directory-style pages; `default` — full wide hero. */
  heroImageVariant?: "default" | "accent";
  /** When false, suppresses CMS excerpt under the page title. */
  showExcerpt?: boolean;
  /** When false, suppresses featured/center image even if CMS provides one. */
  showHeroImage?: boolean;
}) {
  const media = page.imageCenter ?? page.featuredImage;
  const kickerText = kicker === null ? null : (kicker ?? readableVariant(page.layoutVariant));
  const t = getPageStrings(page.locale);
  const crumbs = breadcrumbsEnabled ? buildHeaderBreadcrumbs(page, t.home) : [];

  return (
    <header className={styles["page-hero"]}>
      {crumbs.length > 0 ? (
        <nav aria-label="Breadcrumbs" className={styles.breadcrumbs}>
          {crumbs.map((crumb) => (
            <span key={`${crumb.href}-${crumb.label}`}>
              <Link href={crumb.href}>{crumb.label}</Link>
            </span>
          ))}
        </nav>
      ) : null}
      {kickerText ? (
        <p className="font-mono text-xs font-medium uppercase text-stone-soft">{kickerText}</p>
      ) : null}
      <h1>{page.title}</h1>
      {showExcerpt && page.excerpt ? <p className={styles.excerpt}>{page.excerpt}</p> : null}
      {page.tags.length > 0 ? (
        <ul className={styles["tag-list"]} aria-label="Tags">
          {page.tags.map((tag) => (
            <li key={tag.slug}>{tag.name}</li>
          ))}
        </ul>
      ) : null}
      {showHeroImage && media ? (
        <MediaFrame
          media={media}
          alt={media.alternativeText ?? page.title}
          eager
          variant={heroImageVariant === "accent" ? "band" : "wide"}
          className={cn(
            styles["page-hero__image"],
            heroImageVariant === "accent" && styles["page-hero__image--accent"],
          )}
        />
      ) : null}
    </header>
  );
}

/** Same trail as `StandardPage` article heroes: Home → Parent (current page title is the H1). */
function buildHeaderBreadcrumbs(
  page: PageDTO,
  homeLabel: string,
): Array<{ label: string; href: string }> {
  if (!page.parentPage?.slug || !page.parentPage.title) return [];

  return [
    { label: homeLabel, href: `/${page.locale}` },
    {
      label: page.parentPage.title,
      href: `/${page.locale}/${page.parentPage.slug}`,
    },
  ];
}

function readableVariant(value: string): string {
  return value.replaceAll("-", " ");
}
