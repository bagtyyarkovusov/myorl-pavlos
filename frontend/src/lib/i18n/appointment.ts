import type { ContactStrings } from "@/lib/i18n/contact";
import type { Locale } from "@/lib/cms/types";

export type AppointmentStrings = {
  quickContactLabel: string;
  quickContactIntro: string;
  callNowLabel: string;
  emailActionLabel: string;
  preferredDateLabel: string;
  preferredDateHint: string;
  preferredDateRequired: string;
};

const STRINGS: Record<Locale, AppointmentStrings> = {
  el: {
    quickContactLabel: "Ή καλέστε απευθείας",
    quickContactIntro:
      "Για επείγοντα ραντεβού ή γρήγορη επιβεβαίωση, καλέστε την κλινική κατά τις ώρες λειτουργίας.",
    callNowLabel: "Κλήση τώρα",
    emailActionLabel: "Email",
    preferredDateLabel: "Προτιμώμενη ημέρα",
    preferredDateHint: "Η ώρα μπορεί να αναφερθεί στο μήνυμα· θα επικοινωνήσουμε για επιβεβαίωση.",
    preferredDateRequired: "Επιλέξτε προτιμώμενη ημέρα.",
  },
  ru: {
    quickContactLabel: "Или позвоните напрямую",
    quickContactIntro:
      "Для срочной записи или быстрого подтверждения позвоните в клинику в часы работы.",
    callNowLabel: "Позвонить",
    emailActionLabel: "Email",
    preferredDateLabel: "Предпочтительная дата",
    preferredDateHint: "Время можно указать в сообщении — мы перезвоним для подтверждения.",
    preferredDateRequired: "Выберите предпочтительную дату.",
  },
};

const FORM_COPY: Record<Locale, Partial<ContactStrings>> = {
  el: {
    formTitle: "",
    formIntro:
      "Συμπληρώστε τα στοιχεία σας και την προτιμώμενη ημέρα· θα επικοινωνήσουμε για επιβεβαίωση.",
    messageLabel: "Λόγος επίσκεψης και προτιμώμενη ώρα (προαιρετικά)",
    submitLabel: "Αποστολή αιτήματος",
    successTitle: "Το αίτημά σας στάλθηκε.",
    successBody: "Θα επικοινωνήσουμε μαζί σας σύντομα για να επιβεβαιώσουμε το ραντεβού.",
    errorBody: "Δοκιμάστε ξανά ή καλέστε μας απευθείας.",
  },
  ru: {
    formTitle: "",
    formIntro: "Укажите контакты и удобную дату — мы перезвоним для подтверждения.",
    messageLabel: "Причина визита и удобное время (необязательно)",
    submitLabel: "Отправить заявку",
    successTitle: "Заявка отправлена.",
    successBody: "Мы свяжемся с вами в ближайшее время, чтобы подтвердить приём.",
    errorBody: "Попробуйте ещё раз или позвоните нам напрямую.",
  },
};

const MESSAGE_PLACEHOLDER: Record<Locale, string> = {
  el: "π.χ. Τρίτη 17:00, εξέταση ωτίτιδας",
  ru: "напр. вторник 17:00, осмотр уха",
};

export function getAppointmentStrings(locale: Locale): AppointmentStrings {
  return STRINGS[locale];
}

export function getAppointmentFormCopy(locale: Locale): Partial<ContactStrings> {
  return FORM_COPY[locale];
}

export function getAppointmentMessagePlaceholder(locale: Locale): string {
  return MESSAGE_PLACEHOLDER[locale];
}

/** Strip HTML and collapse whitespace for duplicate CMS copy detection. */
export function normalizeProseText(value: string): string {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function cmsContentDuplicatesExcerpt(
  contentHtml: string | null | undefined,
  excerpt: string | null | undefined,
): boolean {
  if (!contentHtml?.trim() || !excerpt?.trim()) {
    return false;
  }
  return normalizeProseText(contentHtml) === normalizeProseText(excerpt);
}
