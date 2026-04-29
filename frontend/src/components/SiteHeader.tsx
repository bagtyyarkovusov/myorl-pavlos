import { SiteHeaderClient } from "@/components/SiteHeaderClient";
import { findAppointmentHref } from "@/lib/navigation/appointment-href";
import type { GlobalSettingsDTO, Locale, NavigationNodeDTO } from "@/lib/cms/types";

type SiteHeaderProps = {
  locale: Locale;
  navigation: NavigationNodeDTO[];
  settings: GlobalSettingsDTO;
};

export async function SiteHeader({ locale, navigation, settings }: SiteHeaderProps) {
  const appointmentHref = findAppointmentHref(navigation, locale);

  return (
    <SiteHeaderClient
      appointmentHref={appointmentHref}
      locale={locale}
      navigation={navigation}
      settings={settings}
    />
  );
}
