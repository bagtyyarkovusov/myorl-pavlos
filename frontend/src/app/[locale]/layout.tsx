import { notFound } from "next/navigation";

import { LocaleLangSetter } from "@/components/LocaleLangSetter";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { MobileActionDock } from "@/components/MobileActionDock";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { SkipLink } from "@/components/SkipLink";
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

  const { navigation, footerNavigation, settings, appointmentHref, contactHref } =
    await getSite(locale);

  return (
    <>
      <SkipLink />
      <LocaleLangSetter lang={locale} />
      <SiteHeader
        locale={locale}
        navigation={navigation}
        appointmentHref={appointmentHref}
        settings={settings}
      />
      <main id="main-content">{children}</main>
      <SiteFooter
        locale={locale}
        navigation={footerNavigation}
        settings={settings}
        appointmentHref={appointmentHref}
        socialLinks={settings.socialLinks}
      />
      <MobileActionDock locale={locale} settings={settings} contactHref={contactHref} />
      <ScrollToTopButton />
    </>
  );
}
