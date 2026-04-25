import Link from "next/link";

import type { Locale, NavigationNodeDTO } from "@/lib/cms/types";

type SiteHeaderProps = {
  locale: Locale;
  navigation: NavigationNodeDTO[];
};

export function SiteHeader({ locale, navigation }: SiteHeaderProps) {
  return (
    <header className="site-header">
      <Link href={`/${locale}`} className="brand">
        MyORL
      </Link>
      <nav aria-label="Primary navigation">
        {navigation.map((item) => (
          <NavigationLink key={item.documentId} item={item} />
        ))}
      </nav>
    </header>
  );
}

function NavigationLink({ item }: { item: NavigationNodeDTO }) {
  const isExternal = /^https?:\/\//i.test(item.href);

  if (isExternal) {
    return (
      <a href={item.href} target="_blank" rel="noreferrer">
        {item.navLabel}
      </a>
    );
  }

  return <Link href={item.href}>{item.navLabel}</Link>;
}
