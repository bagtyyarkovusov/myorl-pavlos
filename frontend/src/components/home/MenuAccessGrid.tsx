import Link from "next/link";
import type { ReactNode } from "react";
import type { NavigationNodeDTO } from "@/lib/cms/types";
import styles from "./MenuAccessGrid.module.css";

type MenuAccessGridProps = {
  navigation: NavigationNodeDTO[];
  locale: "el" | "ru";
};

const HOME_ACCESS_SLUGS = [
  "yperesies",
  "epemvaseis",
  "diagnosi",
  "klinikes",
  "timokatalogos",
  "video",
] as const;

export function MenuAccessGrid({ navigation }: MenuAccessGridProps) {
  const nodes = flattenNavigation(navigation);
  const items = HOME_ACCESS_SLUGS.flatMap((slug) => {
    const node = nodes.find((item) => item.slug === slug);
    if (!node) return [];
    return [
      {
        node,
        title: node.navLabel || node.title,
        description: node.excerpt?.trim() || "",
        slug,
      },
    ];
  });

  if (items.length === 0) return null;

  return (
    <section className={styles["menu-access-section"]} aria-label="Primary site areas">
      <div className="container mx-auto">
        <div className={styles["menu-access-grid"]}>
          {items.map(({ node, title, description, slug }) => (
            <Link className={styles["menu-access-card"]} href={node.href} key={node.documentId}>
              <span className={styles["menu-access-card__accent"]} aria-hidden="true" />
              <span className={styles["menu-access-card__icon"]} aria-hidden="true">
                <MenuIcon slug={slug} />
              </span>
              <span className={styles["menu-access-card__copy"]}>
                <strong>{title}</strong>
                {description ? (
                  <span className={styles["menu-access-card__desc"]}>{description}</span>
                ) : null}
              </span>
              <span className={styles["menu-access-card__arrow"]} aria-hidden="true">
                <ArrowIcon />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

function flattenNavigation(nodes: NavigationNodeDTO[]): NavigationNodeDTO[] {
  return nodes.flatMap((node) => [node, ...flattenNavigation(node.children)]);
}

function MenuIcon({ slug }: { slug: string }) {
  const icon = ICON_PATHS[slug] ?? ICON_PATHS.yperesies;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      aria-hidden="true"
    >
      {icon}
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M5 12h14M12 5l7 7-7 7" />
    </svg>
  );
}

const ICON_PATHS: Record<string, ReactNode> = {
  yperesies: (
    <>
      <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2" />
      <rect x="9" y="3" width="6" height="4" rx="1" />
      <path d="M12 11v4M10 13h4" />
    </>
  ),
  epemvaseis: (
    <>
      <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76Z" />
    </>
  ),
  diagnosi: (
    <>
      <circle cx="11" cy="11" r="8" />
      <path d="M21 21l-4.3-4.3" />
      <path d="M8 11h6M11 8v6" />
    </>
  ),
  klinikes: (
    <>
      <path d="M3 21h18" />
      <path d="M5 21V7l7-4 7 4v14" />
      <path d="M9 21v-6h6v6" />
      <path d="M9 10h2M13 10h2" />
    </>
  ),
  timokatalogos: (
    <>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="M8 8h8M8 12h8M8 16h5" />
    </>
  ),
  video: (
    <>
      <rect x="2" y="3" width="16" height="18" rx="2" />
      <path d="M22 7l-4 3.5v3L22 17V7Z" />
    </>
  ),
};
