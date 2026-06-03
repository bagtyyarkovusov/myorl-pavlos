import type { ContactStrings } from "@/lib/i18n/contact";
import type { Locale } from "@/lib/cms/types";

export type AppointmentStrings = {
  quickContactLabel: string;
  quickContactIntro: string;
  callNowLabel: string;
  emailActionLabel: string;
  preferredDateLabel: string;
  preferredDatePlaceholder: string;
  preferredDateHint: string;
  preferredDateRequired: string;
  calendarActionLabel: string;
  preferredSlotLabel: string;
  preferredSlotPlaceholder: string;
  preferredSlotHint: string;
  preferredSlotRequired: string;
  preferredSlotUnavailable: string;
};

const STRINGS: Record<Locale, AppointmentStrings> = {
  el: {
    quickContactLabel: "Ή καλέστε απευθείας",
    quickContactIntro:
      "Για επείγοντα ραντεβού ή γρήγορη επιβεβαίωση, καλέστε την κλινική κατά τις ώρες λειτουργίας.",
    callNowLabel: "Κλήση τώρα",
    emailActionLabel: "Email",
    preferredDateLabel: "Επιλέξτε ημέρα επίσκεψης",
    preferredDatePlaceholder: "Επιλέξτε ημέρα επίσκεψης",
    preferredDateHint: "Διαθέσιμες ημέρες: Δευτέρα, Τρίτη, Πέμπτη, Παρασκευή.",
    preferredDateRequired: "Επιλέξτε προτιμώμενη ημέρα.",
    calendarActionLabel: "Άνοιγμα ημερολογίου",
    preferredSlotLabel: "Προτιμώμενη ώρα",
    preferredSlotPlaceholder: "Επιλέξτε ώρα",
    preferredSlotHint: "Τα διαθέσιμα ραντεβού εμφανίζονται ανά 30 λεπτά.",
    preferredSlotRequired: "Επιλέξτε προτιμώμενη ώρα.",
    preferredSlotUnavailable: "Δεν υπάρχουν διαθέσιμες ώρες για αυτή την ημέρα.",
  },
  ru: {
    quickContactLabel: "Или позвоните напрямую",
    quickContactIntro:
      "Для срочной записи или быстрого подтверждения позвоните в клинику в часы работы.",
    callNowLabel: "Позвонить",
    emailActionLabel: "Email",
    preferredDateLabel: "Выберите день посещения",
    preferredDatePlaceholder: "Выберите день посещения",
    preferredDateHint: "Доступные дни: понедельник, вторник, четверг, пятница.",
    preferredDateRequired: "Выберите предпочтительную дату.",
    calendarActionLabel: "Открыть календарь",
    preferredSlotLabel: "Предпочтительное время",
    preferredSlotPlaceholder: "Выберите время",
    preferredSlotHint: "Доступное время показано с шагом 30 минут.",
    preferredSlotRequired: "Выберите предпочтительное время.",
    preferredSlotUnavailable: "На этот день нет доступного времени.",
  },
};

const FORM_COPY: Record<Locale, Partial<ContactStrings>> = {
  el: {
    formTitle: "",
    formIntro:
      "Συμπληρώστε το όνομά σας, το τηλέφωνο και την προτιμώμενη ημέρα/ώρα· θα επικοινωνήσουμε για επιβεβαίωση.",
    submitLabel: "Αποστολή αιτήματος",
    successTitle: "Το αίτημά σας στάλθηκε.",
    successBody: "Θα επικοινωνήσουμε μαζί σας σύντομα για να επιβεβαιώσουμε το ραντεβού.",
    errorBody: "Δοκιμάστε ξανά ή καλέστε μας απευθείας.",
  },
  ru: {
    formTitle: "",
    formIntro: "Укажите имя, телефон, удобную дату и время — мы перезвоним для подтверждения.",
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
