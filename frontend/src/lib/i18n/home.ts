import type { Locale } from "@/lib/cms/types";

export type HomeStrings = {
  heroKicker: string;
  heroTitle: string;
  heroLead: string;
  heroCtaLabel: string;
  heroTrustItems: string[];
  /** Shown after CMS page title: italic word + rest of line */
  heroHighlightWord: string;
  heroTagline: string;
  statYears: string;
  statYearsValue: string;
  statLangs: string;
  statLangsValue: string;
  statTopics: string;
  ctaBook: string;
  ctaExplore: string;
  categoriesEyebrow: string;
  categoriesTitleLine1: string;
  categoriesTitleAccent: string;
  categoriesTitleLine2: string;
  sitemapCta: string;
  aboutEyebrow: string;
  aboutTitleLine1: string;
  aboutTitleAccent: string;
  aboutTitleLine2: string;
  visitEyebrow: string;
  visitTitle: string;
  visitLeadIn: string;
  practiceFocusTitle: string;
  practiceFocusBlurb: string;
  entStripLabel: string;
  zoneA: string;
  zoneB: string;
  zoneC: string;
  videoEyebrow: string;
  videoTitleLine1: string;
  videoTitleAccent: string;
  videoTitleLine2: string;
  videoBody: string;
  videoCta: string;
  journalEyebrow: string;
  journalTitleLine1: string;
  journalTitleAccent: string;
  journalTitleLine2: string;
  journalIntro: string;
  featuredLabel: string;
  credentials: string[];
  mediaLabelHero: string;
  mediaLabelAbout: string;
  mediaLabelVideo: string;
  statTopicsFallback: string;
  learnMore: string;
  viewAll: string;
  /** Home visit strip: address, hours, phone/email, map */
  visitMapSectionLabel: string;
  visitMapLabelAddress: string;
  visitMapLabelHours: string;
  visitMapLabelDirect: string;
  visitMapMapTitle: string;
};

const STRINGS: Record<Locale, HomeStrings> = {
  el: {
    heroKicker: "Δρ. Παύλος Τσολαρίδης, M.D. · Αθήνα",
    heroTitle: "Σαφής ΩΡΛ διάγνωση και θεραπεία στην Αθήνα",
    heroLead:
      "Συνεδρίες για ενήλικες και παιδιά με καθαρή εξήγηση, ήρεμη καθοδήγηση και προσωπική φροντίδα από τον δρ. Παύλο Τσολαρίδη, M.D.",
    heroCtaLabel: "Κλείστε ραντεβού",
    heroTrustItems: ["ΩΡΛ εξέταση", "Διάγνωση", "Πλάνο θεραπείας", "Αθήνα"],
    heroHighlightWord: "Κλινική εμπειρία",
    heroTagline: "που εξελίσσεται επί 25+ χρόνια.",
    statYears: "Χρόνια πρακτικής",
    statYearsValue: "25+",
    statLangs: "Γλώσσες συνεδρίας",
    statLangsValue: "3",
    statTopics: "Θεματικές ενότητες",
    ctaBook: "Ραντεβού & επαφή →",
    ctaExplore: "Όλα τα θέματα →",
    categoriesEyebrow: "Θεματικές ενότητες",
    categoriesTitleLine1: "Έξι πυρήνες",
    categoriesTitleAccent: "περιεχομένου",
    categoriesTitleLine2: "για τη φροντίδα σας.",
    sitemapCta: "Πλήρης χάρτης θεμάτων →",
    aboutEyebrow: "Πληροφορίες",
    aboutTitleLine1: "Σαφήνεια στην κλινική πράξη,",
    aboutTitleAccent: "απλή γλώσσα",
    aboutTitleLine2: "για τις αποφάσεις σας.",
    visitEyebrow: "Πρώτα βήματα",
    visitTitle: "Πού να ξεκινήσετε;",
    visitLeadIn: "Γρήγορα σημεία εισόδου",
    practiceFocusTitle: "Στο ιατρείο: τι περιμένετε",
    practiceFocusBlurb:
      "Η πορεία από την πρώτη συνεδρία έως τη θεραπεία: οργανωμένες πληροφορίες, χωρίς περιττό ιατρικό argot.",
    entStripLabel: "ΩΡΛ — βασικές ζώνες",
    zoneA: "Αυτί",
    zoneB: "Μύτη",
    zoneC: "Λάρυγγα",
    videoEyebrow: "Βιντεοθήκη",
    videoTitleLine1: "Δείτε την κλινική",
    videoTitleAccent: "πριν",
    videoTitleLine2: "την επίσκεψή σας.",
    videoBody:
      "Βιντεοσκοπήσεις συνεδριών, επεξηγήσεις και εσωτερικές λήψεις, ώστε να επιλέγετε θέμα και ροή επισκέψεων με αυτοπεποίθηση.",
    videoCta: "Άνοιγμα βιντεοθήκης →",
    journalEyebrow: "Άρθρα",
    journalTitleLine1: "Κείμενα",
    journalTitleAccent: "αναλυτικά",
    journalTitleLine2: "— ανά πάθηση.",
    journalIntro:
      "Επιλογή άρθρων, οργανωμένη ώστε να συνδέεται με το θεματικό περιεχόμενο του ιστότοπου.",
    featuredLabel: "Προτεινόμενο",
    credentials: [
      "Ελληνική Ωτορινολαρυγγολογική Εταιρεία",
      "European Rhinologic Society",
      "European Academy of Facial Plastic Surgery",
      "Ιατρικός Σύλλογος Αθηνών",
      "Ρινολογία — λειτουργική",
      "Παιδο-ΩΡΛ",
    ],
    mediaLabelHero: "Κλινική εικόνα",
    mediaLabelAbout: "Η πρακτική",
    mediaLabelVideo: "Βίντεο — κλινική",
    statTopicsFallback: "6+",
    learnMore: "Μάθετε περισσότερα",
    viewAll: "Δείτε όλες τις υπηρεσίες",
    visitMapSectionLabel: "Διεύθυνση και επικοινωνία",
    visitMapLabelAddress: "Διεύθυνση",
    visitMapLabelHours: "Ώρες",
    visitMapLabelDirect: "Απευθείας",
    visitMapMapTitle: "Τοποθεσία ιατρείου στο χάρτη",
  },
  ru: {
    heroKicker: "д-р Павлос Цоларидис, M.D. · Афины",
    heroTitle: "Понятная ЛОР-диагностика и лечение в Афинах",
    heroLead:
      "Консультации для взрослых и детей с понятным объяснением, спокойной навигацией и внимательным приёмом у д-ра Павлоса Цоларидиса, M.D.",
    heroCtaLabel: "Записаться на приём",
    heroTrustItems: ["ЛОР-осмотр", "Диагностика", "План лечения", "Афины"],
    heroHighlightWord: "клиническая работа",
    heroTagline: "более 25 лет.",
    statYears: "лет практики",
    statYearsValue: "25+",
    statLangs: "языка консультаций",
    statLangsValue: "3",
    statTopics: "тематических разделов",
    ctaBook: "Записаться и контакты →",
    ctaExplore: "Все темы →",
    categoriesEyebrow: "Темы",
    categoriesTitleLine1: "Шесть",
    categoriesTitleAccent: "фокусов",
    categoriesTitleLine2: "по уходу и лечению.",
    sitemapCta: "Полная карта сайта →",
    aboutEyebrow: "О клинике",
    aboutTitleLine1: "Клиническая ясность и",
    aboutTitleAccent: "понятные формулировки",
    aboutTitleLine2: "для ваших решений.",
    visitEyebrow: "С чего начать",
    visitTitle: "С чего начать?",
    visitLeadIn: "Быстрые переходы",
    practiceFocusTitle: "На приёме: чего ожидать",
    practiceFocusBlurb:
      "Путь от первой консультации к лечению: структурированные материалы без лишнего «врачебного» жаргона.",
    entStripLabel: "ЛОР — три зоны",
    zoneA: "Ухо",
    zoneB: "Нос",
    zoneC: "Горло",
    videoEyebrow: "Видео",
    videoTitleLine1: "Посмотрите клинику",
    videoTitleAccent: "до",
    videoTitleLine2: "визита.",
    videoBody:
      "Консультации, пояснения и кадры из кабинетов, чтобы уверенно выбрать тему и сценарий визита.",
    videoCta: "Перейти в видеотеку →",
    journalEyebrow: "Журнал",
    journalTitleLine1: "Тексты",
    journalTitleAccent: "доступным языком",
    journalTitleLine2: "— по заболеваниям.",
    journalIntro: "Подборка материалов, согласованная с разделами сайта.",
    featuredLabel: "Выбор",
    credentials: [
      "Греческое ЛОР-общество",
      "European Rhinologic Society",
      "European Academy of Facial Plastic Surgery",
      "Афинская медицинская ассоциация",
      "Ринология — функциональная",
      "Детское ЛОР",
    ],
    mediaLabelHero: "Клиника — фото",
    mediaLabelAbout: "Практика",
    mediaLabelVideo: "Видео — клиника",
    statTopicsFallback: "6+",
    learnMore: "Узнать больше",
    viewAll: "Все услуги",
    visitMapSectionLabel: "Адрес и контакты",
    visitMapLabelAddress: "Адрес",
    visitMapLabelHours: "Часы",
    visitMapLabelDirect: "Контакты",
    visitMapMapTitle: "Кабинет на карте",
  },
};

export function getHomeStrings(locale: Locale): HomeStrings {
  return STRINGS[locale];
}
