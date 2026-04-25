import { notFound } from "next/navigation";

import { SiteHeader } from "@/components/SiteHeader";
import { fetchNavigation } from "@/lib/cms/client";
import { isLocale } from "@/lib/cms/types";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const navigation = await fetchNavigation(locale);

  return (
    <>
      <SiteHeader locale={locale} navigation={navigation} />
      {children}
    </>
  );
}
