import { notFound } from "next/navigation";

import { LocaleLangSetter } from "@/components/LocaleLangSetter";
import { SiteFooter } from "@/components/SiteFooter";
import { SiteHeader } from "@/components/SiteHeader";
import { ScrollToTopButton } from "@/components/ScrollToTopButton";
import { findAppointmentHref } from "@/lib/navigation/appointment-href";
import { getPageResult, getSite } from "@/lib/cms/cms-api";
import { isLocale } from "@/lib/cms/types";
import type { SectionDTO, SocialLinkItemDTO } from "@/lib/cms/types";

type LocaleLayoutProps = {
  children: React.ReactNode;
  params: Promise<{
    locale: string;
  }>;
};

type SocialSection = Extract<SectionDTO, { __component: "sections.social-links" }>;

export default async function LocaleLayout({ children, params }: LocaleLayoutProps) {
  const { locale } = await params;
  if (!isLocale(locale)) {
    notFound();
  }

  const { navigation, settings } = await getSite(locale);
  const appointmentHref = findAppointmentHref(navigation, locale);

  const socialLinks = await getSocialLinks(locale);

  return (
    <>
      <LocaleLangSetter lang={locale} />
      <SiteHeader locale={locale} navigation={navigation} settings={settings} />
      {children}
      <SiteFooter
        locale={locale}
        navigation={navigation}
        settings={settings}
        appointmentHref={appointmentHref}
        socialLinks={socialLinks}
      />
      <ScrollToTopButton />
    </>
  );
}

async function getSocialLinks(locale: "el" | "ru"): Promise<SocialLinkItemDTO[]> {
  const result = await getPageResult(locale, "index");
  if (!result.ok) return [];
  const social = result.page.sections.find(
    (section): section is SocialSection => section.__component === "sections.social-links",
  );
  return social?.links ?? [];
}
