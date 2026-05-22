import { SiteHeaderClient } from "@/components/SiteHeaderClient";
import type { GlobalSettingsDTO, Locale, NavigationNodeDTO } from "@/lib/cms/types";

type SiteHeaderProps = {
  locale: Locale;
  navigation: NavigationNodeDTO[];
  appointmentHref: string;
  settings: GlobalSettingsDTO;
};

export async function SiteHeader({
  locale,
  navigation,
  appointmentHref,
  settings,
}: SiteHeaderProps) {
  return (
    <SiteHeaderClient
      appointmentHref={appointmentHref}
      locale={locale}
      navigation={navigation}
      settings={settings}
    />
  );
}
