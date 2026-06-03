import type { NextRequest } from "next/server";

import { readContactAttachment, type ContactAttachment } from "@/lib/contact/contact-attachment";
import { contactFormSchema, type ContactFormInput } from "@/lib/contact/contact-form-schema";

export type ParsedContactRequest =
  | { ok: true; data: ContactFormInput; attachment: ContactAttachment | null }
  | { ok: false; error: string };

export async function parseContactRequest(request: NextRequest): Promise<ParsedContactRequest> {
  const contentType = request.headers.get("content-type") ?? "";

  if (contentType.includes("multipart/form-data")) {
    return parseMultipartRequest(await request.formData());
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return { ok: false, error: "invalid_json" };
  }

  return parseJsonRequest(body);
}

async function parseMultipartRequest(formData: FormData): Promise<ParsedContactRequest> {
  const fields = {
    locale: stringField(formData.get("locale")),
    name: stringField(formData.get("name")),
    email: stringField(formData.get("email")),
    phone: stringField(formData.get("phone")),
    message: stringField(formData.get("message")),
    formType: stringField(formData.get("formType")) || "contact",
    preferredDate: stringField(formData.get("preferredDate")) || undefined,
    preferredSlot: stringField(formData.get("preferredSlot")) || undefined,
    company: stringField(formData.get("company")),
  };

  const parsed = contactFormSchema.safeParse(fields);
  if (!parsed.success) {
    return { ok: false, error: "invalid_payload" };
  }
  if (parsed.data.company.trim().length > 0) {
    return { ok: false, error: "spam" };
  }

  const rawAttachment = formData.get("attachment");
  if (rawAttachment === null) {
    return { ok: true, data: parsed.data, attachment: null };
  }

  if (!(rawAttachment instanceof File)) {
    return { ok: false, error: "invalid_attachment_type" };
  }

  if (rawAttachment.size === 0) {
    return { ok: true, data: parsed.data, attachment: null };
  }

  const attachmentResult = await readContactAttachment(rawAttachment);
  if (!attachmentResult.ok) {
    return { ok: false, error: attachmentResult.error };
  }

  return { ok: true, data: parsed.data, attachment: attachmentResult.attachment };
}

function parseJsonRequest(body: unknown): ParsedContactRequest {
  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "invalid_payload" };
  }
  if (parsed.data.company.trim().length > 0) {
    return { ok: false, error: "spam" };
  }
  return { ok: true, data: parsed.data, attachment: null };
}

function stringField(value: FormDataEntryValue | null): string {
  return typeof value === "string" ? value : "";
}
