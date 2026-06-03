import { z } from "zod";

import type { Locale } from "@/lib/cms/types";

const isoDatePattern = /^\d{4}-\d{2}-\d{2}$/;
const timeSlotPattern = /^([01]\d|2[0-3]):[0-5]\d$/;
const emailSchema = z.string().email();

const APPOINTMENT_SCHEDULE = {
  1: { startHour: 9, endHour: 14 },
  2: { startHour: 14, endHour: 20 },
  4: { startHour: 14, endHour: 20 },
  5: { startHour: 9, endHour: 14 },
} as const satisfies Record<number, { startHour: number; endHour: number }>;

export const contactFormSchema = z
  .object({
    locale: z.enum(["el", "ru"]),
    name: z.string().trim().min(2, "name").max(120, "name"),
    email: z.string().trim().max(254, "email").default(""),
    phone: z.string().trim().min(6, "phone").max(40, "phone"),
    message: z.string().trim().max(5000, "message"),
    formType: z.enum(["contact", "appointment"]).optional().default("contact"),
    preferredDate: z.string().trim().regex(isoDatePattern, "preferredDate").optional(),
    preferredSlot: z.string().trim().regex(timeSlotPattern, "preferredSlot").optional(),
    /** Honeypot — must stay empty. */
    company: z.string().optional().default(""),
  })
  .superRefine((data, ctx) => {
    if (data.formType === "contact" || data.email.length > 0) {
      const parsedEmail = emailSchema.safeParse(data.email);
      if (!parsedEmail.success) {
        ctx.addIssue({ code: "custom", path: ["email"], message: "email" });
      }
    }
    if (data.formType === "appointment") {
      if (!data.preferredDate) {
        ctx.addIssue({ code: "custom", path: ["preferredDate"], message: "required" });
      }
      if (!data.preferredSlot) {
        ctx.addIssue({ code: "custom", path: ["preferredSlot"], message: "required" });
      }
      if (
        data.preferredDate &&
        data.preferredSlot &&
        !isValidAppointmentSlot(data.preferredDate, data.preferredSlot)
      ) {
        ctx.addIssue({ code: "custom", path: ["preferredSlot"], message: "preferredSlot" });
      }
    }
    if (data.formType === "contact" && data.message.length < 10) {
      ctx.addIssue({ code: "custom", path: ["message"], message: "message" });
    }
    if (data.formType === "appointment" && data.message.length > 0 && data.message.length < 10) {
      ctx.addIssue({ code: "custom", path: ["message"], message: "message" });
    }
  });

export type ContactFormInput = z.infer<typeof contactFormSchema>;

export type ContactFormField =
  | "name"
  | "email"
  | "phone"
  | "message"
  | "preferredDate"
  | "preferredSlot";

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

export function getAppointmentSlotsForDate(isoDate: string): string[] {
  if (!isoDatePattern.test(isoDate)) return [];
  const date = dateFromIso(isoDate);
  const schedule = APPOINTMENT_SCHEDULE[date.getUTCDay() as keyof typeof APPOINTMENT_SCHEDULE];
  if (!schedule) return [];

  const slots: string[] = [];
  for (let hour = schedule.startHour; hour < schedule.endHour; hour += 1) {
    slots.push(formatSlot(hour, 0), formatSlot(hour, 30));
  }
  return slots;
}

export function isValidAppointmentSlot(isoDate: string, slot: string): boolean {
  return getAppointmentSlotsForDate(isoDate).includes(slot);
}

export function formatPreferredSlot(locale: Locale, slot: string): string {
  const [hour = "0", minute = "0"] = slot.split(":");
  const date = new Date(Date.UTC(2026, 0, 1, Number(hour), Number(minute)));
  return new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "el-GR", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "UTC",
  }).format(date);
}

function dateFromIso(isoDate: string): Date {
  const parts = isoDate.split("-").map(Number);
  const year = parts[0] ?? 0;
  const month = parts[1] ?? 1;
  const day = parts[2] ?? 1;
  return new Date(Date.UTC(year, month - 1, day));
}

function formatSlot(hour: number, minute: number): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
