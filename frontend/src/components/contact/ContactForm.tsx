"use client";

import { useId, useRef, useState } from "react";

import {
  CONTACT_ATTACHMENT_MAX_BYTES,
  isAllowedAttachmentType,
} from "@/lib/contact/contact-attachment";
import { cn } from "@/lib/utils";
import { getContactStrings } from "@/lib/i18n/contact";
import type { Locale } from "@/lib/cms/types";

import styles from "./ContactForm.module.css";

type ContactFormProps = {
  locale: Locale;
};

type FormState = "idle" | "submitting" | "success" | "error";

export function ContactForm({ locale }: ContactFormProps) {
  const t = getContactStrings(locale);
  const formId = useId();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [state, setState] = useState<FormState>("idle");
  const [attachmentError, setAttachmentError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");

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

    const file = fileInputRef.current?.files?.[0] ?? null;
    const fileError = validateAttachment(file);
    if (fileError) {
      setAttachmentError(fileError);
      return;
    }

    setState("submitting");
    setAttachmentError(null);

    try {
      const body = new FormData();
      body.append("locale", locale);
      body.append("name", name);
      body.append("email", email);
      body.append("phone", phone);
      body.append("message", message);
      body.append("company", "");
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
      <section className={styles.panel} aria-live="polite">
        <h2 className={styles.title}>{t.successTitle}</h2>
        <p className={styles.intro}>{t.successBody}</p>
        <button type="button" className={styles.secondaryAction} onClick={() => setState("idle")}>
          {t.formTitle}
        </button>
      </section>
    );
  }

  return (
    <section className={styles.panel} aria-labelledby={`${formId}-title`}>
      <h2 className={styles.title} id={`${formId}-title`}>
        {t.formTitle}
      </h2>
      <p className={styles.intro}>{t.formIntro}</p>

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

        <div className={styles.field}>
          <label htmlFor={`${formId}-message`}>
            {t.messageLabel} <span aria-hidden="true">*</span>
          </label>
          <textarea
            id={`${formId}-message`}
            name="message"
            rows={6}
            required
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
