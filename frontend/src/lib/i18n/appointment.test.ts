import { describe, expect, it } from "vitest";

import {
  formatPreferredDate,
  getAppointmentSlotsForDate,
  isValidAppointmentSlot,
  parseContactFormPayload,
} from "@/lib/contact/contact-form-schema";
import { cmsContentDuplicatesExcerpt } from "@/lib/i18n/appointment";

describe("parseContactFormPayload", () => {
  it("accepts valid contact payloads", () => {
    const result = parseContactFormPayload({
      locale: "ru",
      name: "Maria",
      email: "maria@example.com",
      phone: "+30 694 000 0000",
      message: "I would like to book an appointment please.",
      company: "",
    });

    expect(result.ok).toBe(true);
  });

  it("requires preferredDate and preferredSlot for appointment submissions", () => {
    const result = parseContactFormPayload({
      locale: "ru",
      name: "Maria",
      email: "maria@example.com",
      phone: "+30 694 000 0000",
      message: "Ear pain for two days, prefer afternoon.",
      formType: "appointment",
      company: "",
    });

    expect(result).toEqual({ ok: false, error: "invalid_payload" });
  });

  it("accepts appointment payloads with preferredDate and preferredSlot", () => {
    const result = parseContactFormPayload({
      locale: "el",
      name: "Maria",
      email: "",
      phone: "+30 694 000 0000",
      message: "",
      formType: "appointment",
      preferredDate: "2026-06-15",
      preferredSlot: "09:30",
      company: "",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.formType).toBe("appointment");
      expect(result.data.preferredDate).toBe("2026-06-15");
      expect(result.data.preferredSlot).toBe("09:30");
      expect(result.data.email).toBe("");
    }
  });

  it("rejects Wednesday and Saturday appointment slots per client schedule", () => {
    const wednesday = parseContactFormPayload({
      locale: "ru",
      name: "Maria",
      email: "",
      phone: "+30 694 000 0000",
      message: "",
      formType: "appointment",
      preferredDate: "2026-06-10",
      preferredSlot: "10:00",
      company: "",
    });
    const saturday = parseContactFormPayload({
      locale: "ru",
      name: "Maria",
      email: "",
      phone: "+30 694 000 0000",
      message: "",
      formType: "appointment",
      preferredDate: "2026-06-13",
      preferredSlot: "10:00",
      company: "",
    });

    expect(wednesday).toEqual({ ok: false, error: "invalid_payload" });
    expect(saturday).toEqual({ ok: false, error: "invalid_payload" });
  });

  it("accepts appointment payloads with empty message", () => {
    const result = parseContactFormPayload({
      locale: "ru",
      name: "Maria",
      email: "",
      phone: "+30 694 000 0000",
      message: "",
      formType: "appointment",
      preferredDate: "2026-06-15",
      preferredSlot: "09:00",
      company: "",
    });

    expect(result.ok).toBe(true);
  });

  it("rejects Sunday appointment slots", () => {
    const result = parseContactFormPayload({
      locale: "ru",
      name: "Maria",
      email: "",
      phone: "+30 694 000 0000",
      message: "",
      formType: "appointment",
      preferredDate: "2026-06-14",
      preferredSlot: "15:00",
      company: "",
    });

    expect(result).toEqual({ ok: false, error: "invalid_payload" });
  });
});

describe("appointment schedule", () => {
  it("exposes Monday slots from 09:00 to 14:00 in 30-minute increments", () => {
    const slots = getAppointmentSlotsForDate("2026-06-15"); // Monday
    expect(slots).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",
      "13:30",
    ]);
    expect(isValidAppointmentSlot("2026-06-15", "09:00")).toBe(true);
    expect(isValidAppointmentSlot("2026-06-15", "13:30")).toBe(true);
    expect(isValidAppointmentSlot("2026-06-15", "08:30")).toBe(false);
    expect(isValidAppointmentSlot("2026-06-15", "14:00")).toBe(false);
  });

  it("exposes Friday slots from 09:00 to 14:00 in 30-minute increments", () => {
    const slots = getAppointmentSlotsForDate("2026-06-19"); // Friday
    expect(slots).toEqual([
      "09:00",
      "09:30",
      "10:00",
      "10:30",
      "11:00",
      "11:30",
      "12:00",
      "12:30",
      "13:00",
      "13:30",
    ]);
    expect(isValidAppointmentSlot("2026-06-19", "09:00")).toBe(true);
    expect(isValidAppointmentSlot("2026-06-19", "13:30")).toBe(true);
    expect(isValidAppointmentSlot("2026-06-19", "08:30")).toBe(false);
    expect(isValidAppointmentSlot("2026-06-19", "14:00")).toBe(false);
  });

  it("exposes Tuesday slots from 14:00 to 20:00 in 30-minute increments", () => {
    const slots = getAppointmentSlotsForDate("2026-06-16"); // Tuesday
    expect(slots).toEqual([
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
      "18:00",
      "18:30",
      "19:00",
      "19:30",
    ]);
    expect(isValidAppointmentSlot("2026-06-16", "14:00")).toBe(true);
    expect(isValidAppointmentSlot("2026-06-16", "19:30")).toBe(true);
    expect(isValidAppointmentSlot("2026-06-16", "13:30")).toBe(false);
    expect(isValidAppointmentSlot("2026-06-16", "20:00")).toBe(false);
  });

  it("exposes Thursday slots from 14:00 to 20:00 in 30-minute increments", () => {
    const slots = getAppointmentSlotsForDate("2026-06-18"); // Thursday
    expect(slots).toEqual([
      "14:00",
      "14:30",
      "15:00",
      "15:30",
      "16:00",
      "16:30",
      "17:00",
      "17:30",
      "18:00",
      "18:30",
      "19:00",
      "19:30",
    ]);
    expect(isValidAppointmentSlot("2026-06-18", "14:00")).toBe(true);
    expect(isValidAppointmentSlot("2026-06-18", "19:30")).toBe(true);
    expect(isValidAppointmentSlot("2026-06-18", "13:30")).toBe(false);
    expect(isValidAppointmentSlot("2026-06-18", "20:00")).toBe(false);
  });

  it("disables Wednesday", () => {
    expect(getAppointmentSlotsForDate("2026-06-17")).toEqual([]); // Wednesday
    expect(isValidAppointmentSlot("2026-06-17", "10:00")).toBe(false);
  });

  it("disables Saturday", () => {
    expect(getAppointmentSlotsForDate("2026-06-20")).toEqual([]); // Saturday
    expect(isValidAppointmentSlot("2026-06-20", "10:00")).toBe(false);
  });

  it("disables Sunday", () => {
    expect(getAppointmentSlotsForDate("2026-06-21")).toEqual([]); // Sunday
    expect(isValidAppointmentSlot("2026-06-21", "10:00")).toBe(false);
  });
});

describe("formatPreferredDate", () => {
  it("formats ISO dates for Greek locale", () => {
    expect(formatPreferredDate("el", "2026-06-15")).toMatch(/2026/);
  });
});

describe("cmsContentDuplicatesExcerpt", () => {
  it("detects duplicate CMS prose", () => {
    expect(
      cmsContentDuplicatesExcerpt(
        "<p>Fill in your details and we will call you back.</p>",
        "Fill in your details and we will call you back.",
      ),
    ).toBe(true);
  });

  it("allows distinct CMS prose", () => {
    expect(
      cmsContentDuplicatesExcerpt(
        "<p>We confirm appointments by phone within one business day.</p>",
        "Fill in your details.",
      ),
    ).toBe(false);
  });
});
