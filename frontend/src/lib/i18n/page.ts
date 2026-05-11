import type { Locale } from "@/lib/cms/types";

export type PageStrings = {
  home: string;
  bookConsultation: string;
  sections: string;
  contents: string;
  articleDetails: string;
  relatedTopics: string;
  sources: string;
  author: string;
  updatedClinicalReview: string;
  sourcesIncluded: string;
  sectionNavLabel: string;
  openLabel: string;
  moreLabel: (count: number) => string;
  backToSection: (parentTitle: string) => string;
};

const STRINGS: Record<Locale, PageStrings> = {
  el: {
    home: "Αρχική",
    bookConsultation: "Κλείσε ραντεβού",
    sections: "Ενότητες",
    contents: "Περιεχόμενα",
    articleDetails: "Λεπτομέρειες άρθρου",
    relatedTopics: "Σχετικά θέματα",
    sources: "Πηγές",
    author: "Συγγραφέας",
    updatedClinicalReview: "Ενημερωμένο",
    sourcesIncluded: "Πηγές συμπεριλαμβάνονται",
    sectionNavLabel: "Πλοήγηση ενότητας",
    openLabel: "Άνοιγμα",
    moreLabel: (count) => `Περισσότερα (+${count})`,
    backToSection: (title) => `← ${title}`,
  },
  ru: {
    home: "Главная",
    bookConsultation: "Записаться на приём",
    sections: "Разделы",
    contents: "Содержание",
    articleDetails: "Детали статьи",
    relatedTopics: "Похожие темы",
    sources: "Источники",
    author: "Автор",
    updatedClinicalReview: "Обновлено",
    sourcesIncluded: "Есть источники",
    sectionNavLabel: "Навигация по разделу",
    openLabel: "Открыть",
    moreLabel: (count) => `Ещё (+${count})`,
    backToSection: (title) => `← ${title}`,
  },
};

export function getPageStrings(locale: Locale): PageStrings {
  return STRINGS[locale];
}
