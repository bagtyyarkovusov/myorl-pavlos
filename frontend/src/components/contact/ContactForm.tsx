"use client";

import { useId, useRef, useState } from "react";

import {
  CONTACT_ATTACHMENT_MAX_BYTES,
  isAllowedAttachmentType,
} from "@/lib/contact/contact-attachment";
import { getAppointmentSlotsForDate } from "@/lib/contact/contact-form-schema";
import { cn } from "@/lib/utils";
import { getContactStrings, type ContactStrings } from "@/lib/i18n/contact";
import type { AppointmentStrings } from "@/lib/i18n/appointment";
import type { Locale } from "@/lib/cms/types";

import styles from "./ContactForm.module.css";

type ContactFormProps = {
  locale: Locale;
  variant?: "contact" | "appointment";
  copy?: Partial<ContactStrings>;
  messagePlaceholder?: string;
  appointmentStrings?: AppointmentStrings;
};

type FormState = "idle" | "submitting" | "success" | "error";
type AppointmentPickerStep = "day" | "hour" | "minute";

const WEEKDAY_LABELS: Record<Locale, string[]> = {
  el: ["Δε", "Τρ", "Τε", "Πε", "Πα", "Σα", "Κυ"],
  ru: ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"],
};

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseIsoDateParts(isoDate: string): { year: number; month: number; day: number } {
  const [year = "0", month = "1", day = "1"] = isoDate.split("-");
  return { year: Number(year), month: Number(month), day: Number(day) };
}

function formatIsoDate(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function getInitialPickerMonth(): { year: number; month: number } {
  const { year, month } = parseIsoDateParts(todayIsoDate());
  return { year, month };
}

function getMonthLabel(locale: Locale, year: number, month: number): string {
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "el-GR", {
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  }).format(new Date(Date.UTC(year, month - 1, 1)));
}

function getCalendarDays(
  year: number,
  month: number,
): Array<{
  day: number;
  isoDate: string;
  isCurrentMonth: boolean;
}> {
  const firstDay = new Date(Date.UTC(year, month - 1, 1));
  const mondayOffset = (firstDay.getUTCDay() + 6) % 7;
  const startDate = new Date(Date.UTC(year, month - 1, 1 - mondayOffset));

  return Array.from({ length: 42 }, (_, index) => {
    const date = new Date(startDate);
    date.setUTCDate(startDate.getUTCDate() + index);
    const cellYear = date.getUTCFullYear();
    const cellMonth = date.getUTCMonth() + 1;
    return {
      day: date.getUTCDate(),
      isoDate: formatIsoDate(cellYear, cellMonth, date.getUTCDate()),
      isCurrentMonth: cellMonth === month,
    };
  });
}

function getSlotHours(slots: string[]): string[] {
  return Array.from(new Set(slots.map((slot) => slot.slice(0, 2))));
}

function getSlotsForHour(slots: string[], hour: string): string[] {
  return slots.filter((slot) => slot.startsWith(hour));
}

function formatSlotDisplay(slot: string): string {
  const [hour = "0", minute = "00"] = slot.split(":");
  return `${Number(hour)}:${minute}`;
}

function formatAppointmentDisplay(preferredDate: string, preferredSlot: string): string {
  if (!preferredDate || !preferredSlot) return "";
  const { day, month, year } = parseIsoDateParts(preferredDate);
  return `${String(day).padStart(2, "0")}/${String(month).padStart(2, "0")}/${year} ${formatSlotDisplay(preferredSlot)}`;
}

export function ContactForm({
  locale,
  variant = "contact",
  copy,
  messagePlaceholder,
  appointmentStrings,
}: ContactFormProps) {
  const t = { ...getContactStrings(locale), ...copy };
  const isAppointment = variant === "appointment";
  const showFormTitle = t.formTitle.trim().length > 0;
  const messageRequired = !isAppointment;
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<FormState>("idle");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [preferredDateError, setPreferredDateError] = useState<string | null>(null);
  const [preferredSlotError, setPreferredSlotError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [preferredSlot, setPreferredSlot] = useState("");
  const [message, setMessage] = useState("");
  const [pickerOpen, setPickerOpen] = useState(false);
  const [pickerStep, setPickerStep] = useState<AppointmentPickerStep>("day");
  const [pickerMonth, setPickerMonth] = useState(getInitialPickerMonth);
  const [selectedHour, setSelectedHour] = useState("");
  const minDate = todayIsoDate();
  const appointmentSlots = isAppointment ? getAppointmentSlotsForDate(preferredDate) : [];
  const appointmentDisplayValue = formatAppointmentDisplay(preferredDate, preferredSlot);
  const calendarDays = getCalendarDays(pickerMonth.year, pickerMonth.month);
  const appointmentHours = getSlotHours(appointmentSlots);
  const appointmentMinuteSlots = selectedHour
    ? getSlotsForHour(appointmentSlots, selectedHour)
    : [];

  function openAppointmentPicker() {
    if (state === "submitting") return;
    setPickerOpen(true);
    setPickerStep(preferredDate ? "hour" : "day");
  }

  function shiftPickerMonth(delta: number) {
    setPickerMonth((current) => {
      const next = new Date(Date.UTC(current.year, current.month - 1 + delta, 1));
      return { year: next.getUTCFullYear(), month: next.getUTCMonth() + 1 };
    });
  }

  function handleDatePick(isoDate: string) {
    setPreferredDate(isoDate);
    setPreferredSlot("");
    setSelectedHour("");
    setPreferredDateError(null);
    setPreferredSlotError(null);
    setPickerStep("hour");
  }

  function handleHourPick(hour: string) {
    setSelectedHour(hour);
    setPickerStep("minute");
  }

  function handleMinutePick(slot: string) {
    setPreferredSlot(slot);
    setPreferredSlotError(null);
    setPickerOpen(false);
  }

  function validateAttachment(file: File | null): string | null {
    if (!file || file.size === 0) {
      return null;
    }
    if (file.size > CONTACT_ATTACHMENT_MAX_BYTES) {
      return t.attachmentErrorTooLarge;
    }
    if (!isAllowedAttachmentType(file.name, file.type)) {
      return t.attachmentErrorType;
    }
    return null;
  }

  function handleAttachmentChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    const error = validateAttachment(file);
    setAttachmentError(error);
    setSelectedFileName(error || !file ? null : file.name);
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (state === "submitting") return;

    if (isAppointment && !preferredDate) {
      setPreferredDateError(appointmentStrings?.preferredDateRequired ?? t.requiredNote);
      return;
    }
    if (isAppointment && !preferredSlot) {
      setPreferredSlotError(appointmentStrings?.preferredSlotRequired ?? t.requiredNote);
      return;
    }

    const file = isAppointment ? null : (fileInputRef.current?.files?.[0] ?? null);
    if (!isAppointment) {
      const fileError = validateAttachment(file);
      if (fileError) {
        setAttachmentError(fileError);
        return;
      }
    }

    setState("submitting");
    setAttachmentError(null);
    setPreferredDateError(null);
    setPreferredSlotError(null);

    try {
      const body = new FormData();
      body.append("locale", locale);
      body.append("name", name);
      body.append("email", email);
      body.append("phone", phone);
      body.append("message", message);
      body.append("formType", variant);
      body.append("company", "");
      if (isAppointment && preferredDate) {
        body.append("preferredDate", preferredDate);
      }
      if (isAppointment && preferredSlot) {
        body.append("preferredSlot", preferredSlot);
      }
      if (file && file.size > 0) {
        body.append("attachment", file);
      }

      const response = await fetch("/api/contact", {
        method: "POST",
        body,
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        if (payload?.error === "attachment_too_large") {
          setAttachmentError(t.attachmentErrorTooLarge);
        } else if (payload?.error === "invalid_attachment_type") {
          setAttachmentError(t.attachmentErrorType);
        }
        setState("error");
        return;
      }

      setName("");
      setEmail("");
      setPhone("");
      setPreferredDate("");
      setPreferredSlot("");
      setMessage("");
      setSelectedHour("");
      setPickerOpen(false);
      setPickerStep("day");
      setSelectedFileName(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
      setState("success");
    } catch {
      setState("error");
    }
  }

  if (state === "success") {
    return (
      <section
        className={cn(styles.panel, isAppointment && styles.panelEmbedded)}
        aria-live="polite"
      >
        <h2 className={styles.title}>{t.successTitle}</h2>
        <p className={styles.intro}>{t.successBody}</p>
        <button type="button" className={styles.secondaryAction} onClick={() => setState("idle")}>
          {showFormTitle ? t.formTitle : t.submitLabel}
        </button>
      </section>
    );
  }

  return (
    <section
      className={cn(styles.panel, isAppointment && styles.panelEmbedded)}
      {...(showFormTitle ? { "aria-labelledby": `${formId}-title` } : {})}
    >
      {showFormTitle ? (
        <h2 className={styles.title} id={`${formId}-title`}>
          {t.formTitle}
        </h2>
      ) : null}
      <p className={styles.intro} id={showFormTitle ? undefined : `${formId}-intro`}>
        {t.formIntro}
      </p>

      {state === "error" ? (
        <div className={styles.alert} role="alert">
          <p className={styles.alertTitle}>{t.errorTitle}</p>
          <p>{t.errorBody}</p>
        </div>
      ) : null}

      <form className={styles.form} onSubmit={handleSubmit} noValidate lang={locale}>
        <div className={styles.field}>
          <label htmlFor={`${formId}-name`}>
            {t.nameLabel} <span aria-hidden="true">*</span>
          </label>
          <input
            id={`${formId}-name`}
            name="name"
            type="text"
            autoComplete="name"
            required
            value={name}
            onChange={(event) => setName(event.target.value)}
            disabled={state === "submitting"}
          />
        </div>

        <div className={styles.fieldRow}>
          {!isAppointment ? (
            <div className={styles.field}>
              <label htmlFor={`${formId}-email`}>
                {t.emailLabel} <span aria-hidden="true">*</span>
              </label>
              <input
                id={`${formId}-email`}
                name="email"
                type="email"
                autoComplete="email"
                inputMode="email"
                required
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                disabled={state === "submitting"}
              />
            </div>
          ) : null}
          <div className={styles.field}>
            <label htmlFor={`${formId}-phone`}>
              {t.phoneLabel} <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${formId}-phone`}
              name="phone"
              type="tel"
              autoComplete="tel"
              inputMode="tel"
              required
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
              disabled={state === "submitting"}
            />
          </div>
        </div>

        {isAppointment && appointmentStrings ? (
          <div className={styles.field}>
            <div className={cn(styles.field, styles.appointmentPicker)}>
              <label htmlFor={`${formId}-preferred-date`}>
                {appointmentStrings.preferredDateLabel} <span aria-hidden="true">*</span>
              </label>
              <div className={styles.dateInputGroup}>
                <input
                  id={`${formId}-preferred-date`}
                  type="text"
                  readOnly
                  required
                  value={appointmentDisplayValue}
                  placeholder={appointmentStrings.preferredDatePlaceholder}
                  onClick={openAppointmentPicker}
                  disabled={state === "submitting"}
                  aria-describedby={`${formId}-preferred-date-hint${preferredDateError ? ` ${formId}-preferred-date-error` : ""}${preferredSlotError ? ` ${formId}-preferred-slot-error` : ""}`}
                  aria-invalid={preferredDateError || preferredSlotError ? true : undefined}
                />
                <button
                  type="button"
                  className={styles.datePickerButton}
                  aria-label={appointmentStrings.calendarActionLabel}
                  onClick={openAppointmentPicker}
                  disabled={state === "submitting"}
                >
                  <span aria-hidden="true">▦</span>
                </button>
              </div>
              <p className={styles.fileHint} id={`${formId}-preferred-date-hint`}>
                {preferredDate && appointmentSlots.length === 0
                  ? appointmentStrings.preferredSlotUnavailable
                  : appointmentStrings.preferredDateHint}
              </p>
              {preferredDateError ? (
                <p className={styles.fileError} id={`${formId}-preferred-date-error`} role="alert">
                  {preferredDateError}
                </p>
              ) : null}
              {preferredSlotError ? (
                <p className={styles.fileError} id={`${formId}-preferred-slot-error`} role="alert">
                  {preferredSlotError}
                </p>
              ) : null}
              {pickerOpen ? (
                <div className={styles.datePickerPanel} role="dialog" aria-modal="false">
                  {pickerStep === "day" ? (
                    <>
                      <div className={styles.pickerHeader}>
                        <button
                          type="button"
                          className={styles.pickerNav}
                          aria-label="Previous month"
                          onClick={() => shiftPickerMonth(-1)}
                        >
                          ‹
                        </button>
                        <p className={styles.pickerTitle}>
                          {getMonthLabel(locale, pickerMonth.year, pickerMonth.month)}
                        </p>
                        <button
                          type="button"
                          className={styles.pickerNav}
                          aria-label="Next month"
                          onClick={() => shiftPickerMonth(1)}
                        >
                          ›
                        </button>
                      </div>
                      <div className={styles.weekdayGrid} aria-hidden="true">
                        {WEEKDAY_LABELS[locale].map((weekday) => (
                          <span key={weekday}>{weekday}</span>
                        ))}
                      </div>
                      <div className={styles.dayGrid}>
                        {calendarDays.map((day) => {
                          const slots = getAppointmentSlotsForDate(day.isoDate);
                          if (!day.isCurrentMonth) {
                            return (
                              <span
                                key={day.isoDate}
                                className={styles.outsideMonth}
                                aria-hidden="true"
                              />
                            );
                          }
                          const disabled = day.isoDate < minDate || slots.length === 0;
                          return (
                            <button
                              key={day.isoDate}
                              type="button"
                              className={styles.dayButton}
                              disabled={disabled}
                              aria-pressed={preferredDate === day.isoDate}
                              onClick={() => handleDatePick(day.isoDate)}
                            >
                              {day.day}
                            </button>
                          );
                        })}
                      </div>
                    </>
                  ) : null}
                  {pickerStep === "hour" ? (
                    <div className={styles.pickerStep}>
                      <button
                        type="button"
                        className={styles.pickerBack}
                        onClick={() => setPickerStep("day")}
                      >
                        {appointmentStrings.preferredDateLabel}
                      </button>
                      <div className={cn(styles.slotGrid, styles.timeGrid)}>
                        {appointmentHours.map((hour) => (
                          <button
                            key={hour}
                            type="button"
                            className={styles.slotButton}
                            aria-pressed={selectedHour === hour}
                            onClick={() => handleHourPick(hour)}
                          >
                            {formatSlotDisplay(`${hour}:00`)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                  {pickerStep === "minute" ? (
                    <div className={styles.pickerStep}>
                      <button
                        type="button"
                        className={styles.pickerBack}
                        onClick={() => setPickerStep("hour")}
                      >
                        {appointmentStrings.preferredSlotLabel}
                      </button>
                      <div className={cn(styles.slotGrid, styles.timeGrid)}>
                        {appointmentMinuteSlots.map((slot) => (
                          <button
                            key={slot}
                            type="button"
                            className={styles.slotButton}
                            aria-pressed={preferredSlot === slot}
                            onClick={() => handleMinutePick(slot)}
                          >
                            {formatSlotDisplay(slot)}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className={styles.field}>
          <label htmlFor={`${formId}-message`}>
            {t.messageLabel}
            {messageRequired ? <span aria-hidden="true"> *</span> : null}
          </label>
          <textarea
            id={`${formId}-message`}
            name="message"
            rows={6}
            required={messageRequired}
            placeholder={messagePlaceholder}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            disabled={state === "submitting"}
          />
        </div>

        {!isAppointment ? (
          <div className={styles.field}>
            <label htmlFor={`${formId}-attachment`}>{t.attachmentLabel}</label>
            <input
              ref={fileInputRef}
              id={`${formId}-attachment`}
              name="attachment"
              type="file"
              accept=".pdf,.jpg,.jpeg,.png,.heic,.heif,application/pdf,image/jpeg,image/png,image/heic,image/heif"
              className={styles.fileInput}
              onChange={handleAttachmentChange}
              disabled={state === "submitting"}
              aria-describedby={`${formId}-attachment-hint${attachmentError ? ` ${formId}-attachment-error` : ""}`}
              aria-invalid={attachmentError ? true : undefined}
            />
            <p className={styles.fileHint} id={`${formId}-attachment-hint`}>
              {t.attachmentHint}
            </p>
            {selectedFileName ? <p className={styles.fileName}>{selectedFileName}</p> : null}
            {attachmentError ? (
              <p className={styles.fileError} id={`${formId}-attachment-error`} role="alert">
                {attachmentError}
              </p>
            ) : null}
          </div>
        ) : null}

        <div className={styles.honeypot} aria-hidden="true">
          <label htmlFor={`${formId}-company`}>Company</label>
          <input
            id={`${formId}-company`}
            name="company"
            type="text"
            tabIndex={-1}
            autoComplete="off"
          />
        </div>

        <div className={styles.actions}>
          <p className={styles.requiredNote}>{t.requiredNote}</p>
          <button
            type="submit"
            className={cn(styles.submit, state === "submitting" && styles.submitPending)}
            disabled={state === "submitting"}
          >
            {state === "submitting" ? t.sendingLabel : t.submitLabel}
          </button>
        </div>
      </form>
    </section>
  );
}
