import { z } from "zod";

import type { Locale } from "@/lib/cms/types";

export const contactFormSchema = z.object({
  locale: z.enum(["el", "ru"]),
  name: z.string().trim().min(2, "name").max(120, "name"),
  email: z.string().trim().email("email").max(254, "email"),
  phone: z.string().trim().min(6, "phone").max(40, "phone"),
  message: z.string().trim().min(10, "message").max(5000, "message"),
  /** Honeypot — must stay empty. */
  company: z.string().optional().default(""),
});

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export type ContactFormField = "name" | "email" | "phone" | "message";

export function parseContactFormPayload(
  body: unknown,
): { ok: true; data: ContactFormInput } | { ok: false; error: string } {
  const parsed = contactFormSchema.safeParse(body);
  if (!parsed.success) {
    return { ok: false, error: "invalid_payload" };
  }
  if (parsed.data.company.trim().length > 0) {
    return { ok: false, error: "spam" };
  }
  return { ok: true, data: parsed.data };
}

export function isLocale(value: string): value is Locale {
  return value === "el" || value === "ru";
}
