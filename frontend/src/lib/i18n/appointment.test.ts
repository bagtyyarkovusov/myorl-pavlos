import { describe, expect, it } from "vitest";

import { formatPreferredDate, parseContactFormPayload } from "@/lib/contact/contact-form-schema";
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

  it("requires preferredDate for appointment submissions", () => {
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

  it("accepts appointment payloads with preferredDate", () => {
    const result = parseContactFormPayload({
      locale: "el",
      name: "Maria",
      email: "maria@example.com",
      phone: "+30 694 000 0000",
      message: "Ear pain for two days, prefer 17:00.",
      formType: "appointment",
      preferredDate: "2026-06-15",
      company: "",
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.data.formType).toBe("appointment");
      expect(result.data.preferredDate).toBe("2026-06-15");
    }
  });

  it("accepts appointment payloads with empty message", () => {
    const result = parseContactFormPayload({
      locale: "ru",
      name: "Maria",
      email: "maria@example.com",
      phone: "+30 694 000 0000",
      message: "",
      formType: "appointment",
      preferredDate: "2026-06-15",
      company: "",
    });

    expect(result.ok).toBe(true);
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
