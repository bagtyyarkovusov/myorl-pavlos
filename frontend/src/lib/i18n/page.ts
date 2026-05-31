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
  publishedOn: string;
  updatedOn: string;
  updatedClinicalReview: string;
  sourcesIncluded: string;
  medicallyReviewedBy: (reviewer: string, date: string) => string;
  sectionNavLabel: string;
  sectionNavPrevious: string;
  sectionNavNext: string;
  openLabel: string;
  moreLabel: (count: number) => string;
  backToSection: (parentTitle: string) => string;
  directoryEmpty: string;
  backToOverview: string;
  directoryFilterEmpty: string;
  directoryMoreFilters: string;
  directoryFeaturedLabel: string;
  directoryAllLabel: string;
  /** Primary filter chip: show all examinations (clears active tag). */
  directoryAllFiltersLabel: string;
  /** Link next to result count when a tag filter is active. */
  directoryClearFilter: string;
  directoryResultCount: (count: number) => string;
  paginationLabel: string;
  paginationFirst: string;
  paginationPrevious: string;
  paginationNext: string;
  paginationLast: string;
  directoryClosureCopy: string;
  directoryClosureCta: string;
  questionListClosureCopy: string;
  videoReadMore: string;
  videoPlayLabel: string;
  videoDirectoryEmpty: string;
  humanSitemapNavLabel: string;
  clinicBookOnline: string;
  clinicViewGallery: string;
  clinicBackToOverview: string;
  clinicGalleryPrevious: string;
  clinicGalleryNext: string;
  clinicGalleryStripLabel: string;
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
    publishedOn: "Δημοσιεύτηκε",
    updatedOn: "Ενημερώθηκε",
    author: "Συγγραφέας",
    updatedClinicalReview: "Ενημερωμένο",
    sourcesIncluded: "Πηγές συμπεριλαμβάνονται",
    medicallyReviewedBy: (reviewer, date) => `Ιατρικά ελεγμένο από ${reviewer} στις ${date}`,
    sectionNavLabel: "Πλοήγηση ενότητας",
    sectionNavPrevious: "Προηγούμενα θέματα",
    sectionNavNext: "Επόμενα θέματα",
    openLabel: "Άνοιγμα",
    moreLabel: (count) => `Περισσότερα (+${count})`,
    backToSection: (title) => `← ${title}`,
    directoryEmpty: "Δεν υπάρχουν ακόμη διαθέσιμες σελίδες.",
    backToOverview: "Επιστροφή στην επισκόπηση",
    directoryFilterEmpty: "Δεν βρέθηκαν αποτελέσματα για αυτό το φίλτρο.",
    directoryMoreFilters: "Περισσότερα φίλτρα",
    directoryFeaturedLabel: "Ξεκινήστε εδώ",
    directoryAllLabel: "Όλες οι εξετάσεις",
    directoryAllFiltersLabel: "Όλα",
    directoryClearFilter: "Εμφάνιση όλων",
    directoryResultCount: (count) => (count === 1 ? "1 αποτέλεσμα" : `${count} αποτελέσματα`),
    paginationLabel: "Σελίδες",
    paginationFirst: "Πρώτη",
    paginationPrevious: "Προηγούμενη",
    paginationNext: "Επόμενη",
    paginationLast: "Τελευταία",
    directoryClosureCopy:
      "Δεν είστε σίγουροι ποια εξέταση χρειάζεστε; Θα σας καθοδηγήσουμε στο ραντεβού.",
    directoryClosureCta: "Κλείστε ραντεβού",
    questionListClosureCopy: "Έχετε ακόμη απορίες; Κλείστε ραντεβού για να τις συζητήσουμε.",
    videoReadMore: "Διαβάστε περισσότερα για το θέμα",
    videoPlayLabel: "Αναπαραγωγή βίντεο",
    videoDirectoryEmpty: "Δεν υπάρχουν διαθέσιμα βίντεο ακόμη.",
    humanSitemapNavLabel: "Χάρτης θεμάτων",
    clinicBookOnline: "Κλείστε ραντεβού ηλεκτρονικά",
    clinicViewGallery: "Δείτε τη γκαλερί",
    clinicBackToOverview: "Επιστροφή στο ιατρείο",
    clinicGalleryPrevious: "Προηγούμενες φωτογραφίες",
    clinicGalleryNext: "Επόμενες φωτογραφίες",
    clinicGalleryStripLabel: "Φωτογραφίες ιατρείου",
  },
  ru: {
    home: "Главная",
    bookConsultation: "Записаться на приём",
    sections: "Разделы",
    contents: "Содержание",
    articleDetails: "Детали статьи",
    relatedTopics: "Похожие темы",
    sources: "Источники",
    publishedOn: "Опубликовано",
    updatedOn: "Обновлено",
    author: "Автор",
    updatedClinicalReview: "Обновлено",
    sourcesIncluded: "Есть источники",
    medicallyReviewedBy: (reviewer, date) => `Медицинская проверка выполнена: ${reviewer}, ${date}`,
    sectionNavLabel: "Навигация по разделу",
    sectionNavPrevious: "Предыдущие темы",
    sectionNavNext: "Следующие темы",
    openLabel: "Открыть",
    moreLabel: (count) => `Ещё (+${count})`,
    backToSection: (title) => `← ${title}`,
    directoryEmpty: "Пока нет доступных страниц.",
    backToOverview: "Вернуться к обзору",
    directoryFilterEmpty: "По этому фильтру ничего не найдено.",
    directoryMoreFilters: "Больше фильтров",
    directoryFeaturedLabel: "С чего начать",
    directoryAllLabel: "Все обследования",
    directoryAllFiltersLabel: "Все",
    directoryClearFilter: "Показать все",
    directoryResultCount: (count) => {
      const mod10 = count % 10;
      const mod100 = count % 100;
      if (mod10 === 1 && mod100 !== 11) return `${count} результат`;
      if (mod10 >= 2 && mod10 <= 4 && (mod100 < 10 || mod100 >= 20)) return `${count} результата`;
      return `${count} результатов`;
    },
    paginationLabel: "Страницы",
    paginationFirst: "Первая",
    paginationPrevious: "Предыдущая",
    paginationNext: "Следующая",
    paginationLast: "Последняя",
    directoryClosureCopy:
      "Не уверены, какое обследование вам нужно? На приёме мы подскажем следующий шаг.",
    directoryClosureCta: "Записаться на приём",
    questionListClosureCopy: "Остались вопросы? Запишитесь на приём — обсудим их лично.",
    videoReadMore: "Читать подробнее об этой теме",
    videoPlayLabel: "Воспроизвести видео",
    videoDirectoryEmpty: "Видео пока недоступны.",
    humanSitemapNavLabel: "Карта сайта",
    clinicBookOnline: "Записаться на приём онлайн",
    clinicViewGallery: "Открыть галерею",
    clinicBackToOverview: "Вернуться к кабинету",
    clinicGalleryPrevious: "Предыдущие фото",
    clinicGalleryNext: "Следующие фото",
    clinicGalleryStripLabel: "Фотографии клиники",
  },
};

export function getPageStrings(locale: Locale): PageStrings {
  return STRINGS[locale];
}
