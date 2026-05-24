import { z } from "zod";

import type { Locale } from "@/lib/cms/types";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export const contactFormSchema = z
  .object({
    locale: z.enum(["el", "ru"]),
    name: z.string().trim().min(2, "name").max(120, "name"),
    email: z.string().trim().email("email").max(254, "email"),
    phone: z.string().trim().min(6, "phone").max(40, "phone"),
    message: z.string().trim().max(5000, "message"),
    formType: z.enum(["contact", "appointment"]).optional().default("contact"),
    preferredDate: z.string().trim().regex(isoDatePattern, "preferredDate").optional(),
    /** Honeypot — must stay empty. */
    company: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.formType === "appointment" && !data.preferredDate) {
      ctx.addIssue({ code: "custom", path: ["preferredDate"], message: "required" });
    }
    if (data.formType === "contact" && data.message.length < 10) {
      ctx.addIssue({ code: "custom", path: ["message"], message: "message" });
    }
    if (data.formType === "appointment" && data.message.length > 0 && data.message.length < 10) {
      ctx.addIssue({ code: "custom", path: ["message"], message: "message" });
    }
  });

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export type ContactFormField = "name" | "email" | "phone" | "message" | "preferredDate";

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

export function formatPreferredDate(locale: Locale, isoDate: string): string {
  const parts = isoDate.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  const date = new Date(Date.UTC(year, month - 1, day));
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "el-GR", {
    dateStyle: "full",
    timeZone: "UTC",
  }).format(date);
}
