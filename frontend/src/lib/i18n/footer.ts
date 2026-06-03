import type { Locale } from "@/lib/cms/types";

export type FooterStrings = {
  practiceLabel: string;
  patientsLabel: string;
  companyLabel: string;
  contactLabel: string;
  bookOnlineLabel: string;
  sitemapLabel: string;
  privacyLabel: string;
  termsLabel: string;
  copyright: string;
  brandLogoAlt: string;
};

const STRINGS: Record<Locale, FooterStrings> = {
  el: {
    practiceLabel: "Ιατρείο",
    patientsLabel: "Ασθενείς",
    companyLabel: "Εταιρεία",
    contactLabel: "Επικοινωνία",
    bookOnlineLabel: "Κλείστε ραντεβού ηλεκτρονικά",
    sitemapLabel: "Χάρτης ιστότοπου",
    privacyLabel: "Απόρρητο",
    termsLabel: "Όροι",
    copyright: "MyORL · Δρ. Παύλος Τσολαρίδης M.D.",
    brandLogoAlt: "MyORL",
  },
  ru: {
    practiceLabel: "Клиника",
    patientsLabel: "Пациентам",
    companyLabel: "Компания",
    contactLabel: "Контакты",
    bookOnlineLabel: "Запись онлайн",
    sitemapLabel: "Карта сайта",
    privacyLabel: "Конфиденциальность",
    termsLabel: "Условия",
    copyright: "MyORL · доктор Павлос Цоларидис, M.D.",
    brandLogoAlt: "MyORL",
  },
};

export function getFooterStrings(locale: Locale): FooterStrings {
  return STRINGS[locale];
}
