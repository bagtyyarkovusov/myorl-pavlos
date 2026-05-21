import type { Locale } from "@/lib/cms/types";

export type HeaderStrings = {
  hours: string;
  address: string;
  phoneTel: string;
  phoneDisplay: string;
  brandLogoAlt: string;
  bookAppointment: string;
  bookAppointmentShort: string;
  openMenu: string;
  closeMenu: string;
  primaryNavLabel: string;
  mobileNavLabel: string;
  mobileNavInnerLabel: string;
  languageLabel: string;
  overviewMobile: string;
  sectionOverviewLink: string;
  sectionOverviewBlurb: (sectionTitle: string) => string;
  topicsLabel: (count: number) => string;
};

const STRINGS: Record<Locale, HeaderStrings> = {
  el: {
    hours: "Δε-Πα 09:00-21:00",
    address: "Λεωφ. Αλεξάνδρας 201, Αθήνα",
    phoneTel: "+302106427000",
    phoneDisplay: "+30 210 6427 000",
    brandLogoAlt: "MyORL — ΩΡΛ Χειρουργική Κλινική Αθηνών",
    bookAppointment: "Κλείσε ραντεβού",
    bookAppointmentShort: "Ραντεβού",
    openMenu: "Άνοιγμα μενού",
    closeMenu: "Κλείσιμο μενού",
    primaryNavLabel: "Κύρια πλοήγηση",
    mobileNavLabel: "Πλοήγηση κινητού",
    mobileNavInnerLabel: "Κύρια πλοήγηση κινητού",
    languageLabel: "Γλώσσα",
    overviewMobile: "Επισκόπηση ενότητας",
    sectionOverviewLink: "Δες την ενότητα",
    sectionOverviewBlurb: (sectionTitle) =>
      `Εξειδικευμένο κλινικό περιεχόμενο, διαδικασίες και οδηγίες ασθενών στην ενότητα «${sectionTitle}».`,
    topicsLabel: (count) => `${count} ${count === 1 ? "θέμα" : "θέματα"}`,
  },
  ru: {
    hours: "Пн-Пт 09:00-21:00",
    address: "пр. Александрас, 201, Афины",
    phoneTel: "+302106427000",
    phoneDisplay: "+30 210 6427 000",
    brandLogoAlt: "MyORL — ЛОР хирургическая клиника, Афины",
    bookAppointment: "Записаться на приём",
    bookAppointmentShort: "Записаться",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    primaryNavLabel: "Основная навигация",
    mobileNavLabel: "Мобильное меню",
    mobileNavInnerLabel: "Основное мобильное меню",
    languageLabel: "Язык",
    overviewMobile: "Обзор раздела",
    sectionOverviewLink: "Открыть раздел",
    sectionOverviewBlurb: (sectionTitle) =>
      `Профильные клинические материалы, процедуры и инструкции для пациентов в разделе «${sectionTitle}».`,
    topicsLabel: (count) => {
      const lastTwo = count % 100;
      const last = count % 10;
      if (lastTwo >= 11 && lastTwo <= 14) return `${count} тем`;
      if (last === 1) return `${count} тема`;
      if (last >= 2 && last <= 4) return `${count} темы`;
      return `${count} тем`;
    },
  },
};

export function getHeaderStrings(locale: Locale): HeaderStrings {
  return STRINGS[locale];
}
