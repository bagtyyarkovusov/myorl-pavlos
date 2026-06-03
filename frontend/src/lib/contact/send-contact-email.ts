import type { ContactFormInput } from "@/lib/contact/contact-form-schema";
import { formatPreferredDate, formatPreferredSlot } from "@/lib/contact/contact-form-schema";
import type { ContactEnv } from "@/lib/contact/contact-env";
import type { ContactAttachment } from "@/lib/contact/contact-attachment";

type SendContactEmailParams = {
  env: ContactEnv;
  payload: ContactFormInput;
  pageUrl?: string;
  attachment?: ContactAttachment | null;
};

type SendContactEmailResult =
  | { ok: true; id: string }
  | { ok: false; reason: "provider_error" | "network_error" };

export async function sendContactEmail({
  env,
  payload,
  pageUrl,
  attachment = null,
}: SendContactEmailParams): Promise<SendContactEmailResult> {
  const isAppointment = payload.formType === "appointment" && payload.preferredDate;
  const formattedDate =
    isAppointment && payload.preferredDate
      ? formatPreferredDate(payload.locale, payload.preferredDate)
      : null;
  const formattedSlot =
    isAppointment && payload.preferredSlot
      ? formatPreferredSlot(payload.locale, payload.preferredSlot)
      : null;

  const subject = isAppointment
    ? `[MyORL] APPOINTMENT — ${payload.locale.toUpperCase()} — ${payload.name}${formattedDate ? ` — ${formattedDate}` : ""}${formattedSlot ? ` ${formattedSlot}` : ""}`
    : `[MyORL] ${payload.locale.toUpperCase()} — ${payload.name}`;

  const text = buildPlainText(payload, pageUrl, attachment, formattedDate, formattedSlot);
  const html = buildHtml(payload, pageUrl, attachment, formattedDate, formattedSlot);

  const emailBody: Record<string, unknown> = {
    from: env.contactFromEmail,
    to: [env.contactToEmail],
    subject,
    text,
    html,
  };

  if (payload.email) {
    emailBody.reply_to = payload.email;
  }

  if (attachment) {
    emailBody.attachments = [
      {
        filename: attachment.filename,
        content: attachment.content.toString("base64"),
      },
    ];
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${env.resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailBody),
    });

    if (!response.ok) {
      return { ok: false, reason: "provider_error" };
    }

    const data = (await response.json()) as { id?: string };
    return { ok: true, id: data.id ?? "sent" };
  } catch {
    return { ok: false, reason: "network_error" };
  }
}

function buildPlainText(
  payload: ContactFormInput,
  pageUrl?: string,
  attachment?: ContactAttachment | null,
  formattedDate?: string | null,
  formattedSlot?: string | null,
): string {
  return [
    `Locale: ${payload.locale}`,
    payload.formType === "appointment" ? "Type: Appointment request" : null,
    `Name: ${payload.name}`,
    payload.email ? `Email: ${payload.email}` : null,
    `Phone: ${payload.phone}`,
    formattedDate ? `Preferred date: ${formattedDate}` : null,
    formattedSlot ? `Preferred time: ${formattedSlot}` : null,
    pageUrl ? `Page: ${pageUrl}` : null,
    attachment ? `Attachment: ${attachment.filename}` : null,
    "",
    payload.message,
  ]
    .filter(Boolean)
    .join("\n");
}

function buildHtml(
  payload: ContactFormInput,
  pageUrl?: string,
  attachment?: ContactAttachment | null,
  formattedDate?: string | null,
  formattedSlot?: string | null,
): string {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return `
    <p><strong>Locale:</strong> ${escape(payload.locale)}</p>
    ${payload.formType === "appointment" ? "<p><strong>Type:</strong> Appointment request</p>" : ""}
    <p><strong>Name:</strong> ${escape(payload.name)}</p>
    ${payload.email ? `<p><strong>Email:</strong> ${escape(payload.email)}</p>` : ""}
    <p><strong>Phone:</strong> ${escape(payload.phone)}</p>
    ${formattedDate ? `<p><strong>Preferred date:</strong> ${escape(formattedDate)}</p>` : ""}
    ${formattedSlot ? `<p><strong>Preferred time:</strong> ${escape(formattedSlot)}</p>` : ""}
    ${pageUrl ? `<p><strong>Page:</strong> ${escape(pageUrl)}</p>` : ""}
    ${attachment ? `<p><strong>Attachment:</strong> ${escape(attachment.filename)}</p>` : ""}
    <hr />
    <p>${escape(payload.message).replace(/\n/g, "<br />")}</p>
  `.trim();
}
