import { notFound } from "next/navigation";

import { LocaleLangSetter } from "@/components/LocaleLangSetter";
import { SiteHeader } from "@/components/SiteHeader";
import { getSite } from "@/lib/cms/cms-api";
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

  const { navigation, settings } = await getSite(locale);

  return (
    <>
      <LocaleLangSetter lang={locale} />
      <SiteHeader locale={locale} navigation={navigation} settings={settings} />
      {children}
    </>
  );
}
