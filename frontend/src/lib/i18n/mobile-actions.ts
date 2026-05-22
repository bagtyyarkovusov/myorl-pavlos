import type { Locale } from "@/lib/cms/types";

export type MobileActionStrings = {
  dockNavLabel: string;
  callLabel: string;
  contactLabel: string;
  callShortLabel: string;
  contactShortLabel: string;
  scrollToTopLabel: string;
};

const STRINGS: Record<Locale, MobileActionStrings> = {
  el: {
    dockNavLabel: "Γρήγορες ενέργειες",
    callLabel: "Κλήση στο κινητό της κλινικής",
    contactLabel: "Αποστολή μηνύματος",
    callShortLabel: "Κλήση",
    contactShortLabel: "Επικοινωνία",
    scrollToTopLabel: "Μετάβαση στην αρχή της σελίδας",
  },
  ru: {
    dockNavLabel: "Быстрые действия",
    callLabel: "Позвонить на мобильный клиники",
    contactLabel: "Написать нам",
    callShortLabel: "Позвонить",
    contactShortLabel: "Контакты",
    scrollToTopLabel: "Вернуться наверх страницы",
  },
};

export function getMobileActionStrings(locale: Locale): MobileActionStrings {
  return STRINGS[locale];
}
