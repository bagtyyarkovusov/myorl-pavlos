import type { Locale } from "@/lib/cms/types";

export type HeaderStrings = {
  brandLogoAlt: string;
  bookAppointment: string;
  bookAppointmentShort: string;
  openMenu: string;
  closeMenu: string;
  primaryNavLabel: string;
  mobileNavLabel: string;
  mobileNavInnerLabel: string;
  languageLabel: string;
  localeUnavailableLabel: string;
  overviewMobile: string;
  sectionOverviewLink: string;
  sectionOverviewBlurb: (sectionTitle: string) => string;
  sectionOverviewMoreHint: (hiddenCount: number) => string;
  topicsLabel: (count: number) => string;
  searchLabel: string;
  searchPlaceholder: string;
};

const STRINGS: Record<Locale, HeaderStrings> = {
  el: {
    brandLogoAlt: "MyORL — ΩΡΛ Χειρουργική Κλινική Αθηνών",
    bookAppointment: "Κλείσε ραντεβού",
    bookAppointmentShort: "Ραντεβού",
    openMenu: "Άνοιγμα μενού",
    closeMenu: "Κλείσιμο μενού",
    primaryNavLabel: "Κύρια πλοήγηση",
    mobileNavLabel: "Πλοήγηση κινητού",
    mobileNavInnerLabel: "Κύρια πλοήγηση κινητού",
    languageLabel: "Γλώσσα",
    localeUnavailableLabel: "Η σελίδα δεν είναι διαθέσιμη σε αυτή τη γλώσσα",
    overviewMobile: "Επισκόπηση ενότητας",
    sectionOverviewLink: "Δες την ενότητα",
    sectionOverviewBlurb: (sectionTitle) =>
      `Εξειδικευμένο κλινικό περιεχόμενο, διαδικασίες και οδηγίες ασθενών στην ενότητα «${sectionTitle}».`,
    sectionOverviewMoreHint: (hiddenCount) =>
      `+${hiddenCount} ${hiddenCount === 1 ? "ακόμη θέμα" : "ακόμη θέματα"} μέσα`,
    topicsLabel: (count) => `${count} ${count === 1 ? "θέμα" : "θέματα"}`,
    searchLabel: "Αναζήτηση",
    searchPlaceholder: "Αναζητήστε άρθρα και βίντεο...",
  },
  ru: {
    brandLogoAlt: "MyORL — ЛОР хирургическая клиника, Афины",
    bookAppointment: "Записаться на приём",
    bookAppointmentShort: "Записаться",
    openMenu: "Открыть меню",
    closeMenu: "Закрыть меню",
    primaryNavLabel: "Основная навигация",
    mobileNavLabel: "Мобильное меню",
    mobileNavInnerLabel: "Основное мобильное меню",
    languageLabel: "Язык",
    localeUnavailableLabel: "Страница недоступна на этом языке",
    overviewMobile: "Обзор раздела",
    sectionOverviewLink: "Открыть раздел",
    sectionOverviewBlurb: (sectionTitle) =>
      `Профильные клинические материалы, процедуры и инструкции для пациентов в разделе «${sectionTitle}».`,
    sectionOverviewMoreHint: (hiddenCount) => {
      const lastTwo = hiddenCount % 100;
      const last = hiddenCount % 10;
      if (lastTwo >= 11 && lastTwo <= 14) return `Ещё ${hiddenCount} тем в разделе`;
      if (last === 1) return `Ещё ${hiddenCount} тема в разделе`;
      if (last >= 2 && last <= 4) return `Ещё ${hiddenCount} темы в разделе`;
      return `Ещё ${hiddenCount} тем в разделе`;
    },
    topicsLabel: (count) => {
      const lastTwo = count % 100;
      const last = count % 10;
      if (lastTwo >= 11 && lastTwo <= 14) return `${count} тем`;
      if (last === 1) return `${count} тема`;
      if (last >= 2 && last <= 4) return `${count} темы`;
      return `${count} тем`;
    },
    searchLabel: "Поиск",
    searchPlaceholder: "Поиск статей и видео...",
  },
};

export function getHeaderStrings(locale: Locale): HeaderStrings {
  return STRINGS[locale];
}
