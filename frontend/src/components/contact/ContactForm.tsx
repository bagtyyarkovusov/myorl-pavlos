"use client";

import { useId, useRef, useState } from "react";

import {
  CONTACT_ATTACHMENT_MAX_BYTES,
  isAllowedAttachmentType,
} from "@/lib/contact/contact-attachment";
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

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [preferredDate, setPreferredDate] = useState("");
  const [message, setMessage] = useState("");
  const minDate = todayIsoDate();

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

    const file = fileInputRef.current?.files?.[0] ?? null;
    const fileError = validateAttachment(file);
    if (fileError) {
      setAttachmentError(fileError);
      return;
    }

    setState("submitting");
    setAttachmentError(null);
    setPreferredDateError(null);

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
      setMessage("");
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
            <label htmlFor={`${formId}-preferred-date`}>
              {appointmentStrings.preferredDateLabel} <span aria-hidden="true">*</span>
            </label>
            <input
              id={`${formId}-preferred-date`}
              name="preferredDate"
              type="date"
              min={minDate}
              required
              value={preferredDate}
              onChange={(event) => {
                setPreferredDate(event.target.value);
                setPreferredDateError(null);
              }}
              disabled={state === "submitting"}
              aria-describedby={`${formId}-preferred-date-hint${preferredDateError ? ` ${formId}-preferred-date-error` : ""}`}
              aria-invalid={preferredDateError ? true : undefined}
            />
            <p className={styles.fileHint} id={`${formId}-preferred-date-hint`}>
              {appointmentStrings.preferredDateHint}
            </p>
            {preferredDateError ? (
              <p className={styles.fileError} id={`${formId}-preferred-date-error`} role="alert">
                {preferredDateError}
              </p>
            ) : null}
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
