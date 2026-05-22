import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { resetContactEnvCacheForTesting } from "@/lib/contact/contact-env";
import { parseContactFormPayload } from "@/lib/contact/contact-form-schema";

describe("parseContactFormPayload", () => {
  it("accepts valid payloads", () => {
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

  it("rejects honeypot submissions as spam", () => {
    const result = parseContactFormPayload({
      locale: "el",
      name: "Bot",
      email: "bot@example.com",
      phone: "2100000000",
      message: "spam message with enough length",
      company: "Evil Corp",
    });

    expect(result).toEqual({ ok: false, error: "spam" });
  });
});

describe("contact env", () => {
  beforeEach(() => {
    resetContactEnvCacheForTesting();
  });

  afterEach(() => {
    resetContactEnvCacheForTesting();
    vi.unstubAllEnvs();
  });

  it("returns null when RESEND_API_KEY is missing", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    const { getContactEnv } = await import("@/lib/contact/contact-env");
    expect(getContactEnv()).toBeNull();
  });
});
