import { SiteHeaderClient } from "@/components/SiteHeaderClient";
import { fetchGlobalSettings } from "@/lib/cms/client";
import { findAppointmentHref } from "@/lib/navigation/appointment-href";
import type { Locale, NavigationNodeDTO } from "@/lib/cms/types";

type SiteHeaderProps = {
  locale: Locale;
  navigation: NavigationNodeDTO[];
};

export async function SiteHeader({ locale, navigation }: SiteHeaderProps) {
  const appointmentHref = findAppointmentHref(navigation, locale);
  const settings = await fetchGlobalSettings(locale);

  return (
    <SiteHeaderClient
      appointmentHref={appointmentHref}
      locale={locale}
      navigation={navigation}
      settings={settings}
    />
  );
}
