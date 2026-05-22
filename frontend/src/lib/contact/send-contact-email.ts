import type { ContactFormInput } from "@/lib/contact/contact-form-schema";
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
  const subject = `[MyORL] ${payload.locale.toUpperCase()} — ${payload.name}`;
  const text = buildPlainText(payload, pageUrl, attachment);
  const html = buildHtml(payload, pageUrl, attachment);

  const emailBody: Record<string, unknown> = {
    from: env.contactFromEmail,
    to: [env.contactToEmail],
    reply_to: payload.email,
    subject,
    text,
    html,
  };

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
): string {
  return [
    `Locale: ${payload.locale}`,
    `Name: ${payload.name}`,
    `Email: ${payload.email}`,
    `Phone: ${payload.phone}`,
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
): string {
  const escape = (value: string) =>
    value
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");

  return `
    <p><strong>Locale:</strong> ${escape(payload.locale)}</p>
    <p><strong>Name:</strong> ${escape(payload.name)}</p>
    <p><strong>Email:</strong> ${escape(payload.email)}</p>
    <p><strong>Phone:</strong> ${escape(payload.phone)}</p>
    ${pageUrl ? `<p><strong>Page:</strong> ${escape(pageUrl)}</p>` : ""}
    ${attachment ? `<p><strong>Attachment:</strong> ${escape(attachment.filename)}</p>` : ""}
    <hr />
    <p>${escape(payload.message).replace(/\n/g, "<br />")}</p>
  `.trim();
}
