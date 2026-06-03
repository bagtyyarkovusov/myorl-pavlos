import type { Locale } from "@/lib/cms/types";

export type ContactStrings = {
  formTitle: string;
  formIntro: string;
  nameLabel: string;
  emailLabel: string;
  phoneLabel: string;
  messageLabel: string;
  attachmentLabel: string;
  attachmentHint: string;
  attachmentErrorTooLarge: string;
  attachmentErrorType: string;
  submitLabel: string;
  requiredNote: string;
  sendingLabel: string;
  successTitle: string;
  successBody: string;
  errorTitle: string;
  errorBody: string;
  clinicsLabel: string;
  contactDetailsLabel: string;
  mapLabel: string;
  mapShowLabel: string;
};

const STRINGS: Record<Locale, ContactStrings> = {
  el: {
    formTitle: "Στείλτε μήνυμα",
    formIntro: "Συμπληρώστε τη φόρμα και θα επικοινωνήσουμε μαζί σας το συντομότερο δυνατό.",
    nameLabel: "Το όνομά σας",
    emailLabel: "Email",
    phoneLabel: "Τηλέφωνο",
    messageLabel: "Μήνυμα",
    attachmentLabel: "Επισύναψη αρχείου",
    attachmentHint: "Προαιρετικό. PDF, JPG, PNG ή HEIC, έως 5 MB.",
    attachmentErrorTooLarge: "Το αρχείο είναι μεγαλύτερο από 5 MB.",
    attachmentErrorType: "Επιτρέπονται μόνο PDF, JPG, PNG ή HEIC.",
    submitLabel: "Αποστολή",
    requiredNote: "Τα πεδία με * είναι υποχρεωτικά.",
    sendingLabel: "Αποστολή…",
    successTitle: "Το μήνυμά σας στάλθηκε.",
    successBody: "Θα επικοινωνήσουμε μαζί σας σύντομα.",
    errorTitle: "Δεν ήταν δυνατή η αποστολή.",
    errorBody: "Δοκιμάστε ξανά ή καλέστε μας απευθείας.",
    clinicsLabel: "Ιατρεία",
    contactDetailsLabel: "Στοιχεία επικοινωνίας",
    mapLabel: "Χάρτης",
    mapShowLabel: "Εμφάνιση χάρτη",
  },
  ru: {
    formTitle: "Отправить сообщение",
    formIntro: "Заполните форму — мы свяжемся с вами как можно скорее.",
    nameLabel: "Ваше имя",
    emailLabel: "Email",
    phoneLabel: "Ваш телефон",
    messageLabel: "Сообщение",
    attachmentLabel: "Прикрепить файл",
    attachmentHint: "Необязательно. PDF, JPG, PNG или HEIC, до 5 МБ.",
    attachmentErrorTooLarge: "Файл больше 5 МБ.",
    attachmentErrorType: "Можно прикрепить только PDF, JPG, PNG или HEIC.",
    submitLabel: "Отправить",
    requiredNote: "Поля, отмеченные *, обязательны.",
    sendingLabel: "Отправка…",
    successTitle: "Сообщение отправлено.",
    successBody: "Мы свяжемся с вами в ближайшее время.",
    errorTitle: "Не удалось отправить сообщение.",
    errorBody: "Попробуйте ещё раз или позвоните нам напрямую.",
    clinicsLabel: "Клиники",
    contactDetailsLabel: "Контактная информация",
    mapLabel: "Карта",
    mapShowLabel: "Показать карту",
  },
};

export function getContactStrings(locale: Locale): ContactStrings {
  return STRINGS[locale];
}
