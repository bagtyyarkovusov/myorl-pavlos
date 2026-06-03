import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

import { resetContactEnvCacheForTesting } from "@/lib/contact/contact-env";

vi.mock("@/lib/contact/send-contact-email", () => ({
  sendContactEmail: vi.fn(async () => ({ ok: true, id: "email-1" })),
}));

vi.mock("@/lib/cms/env", () => ({
  getCmsConfig: () => ({ siteUrl: "https://myorl.example.com" }),
}));

describe("POST /api/contact", () => {
  beforeEach(() => {
    resetContactEnvCacheForTesting();
    vi.stubEnv("RESEND_API_KEY", "re_test_key");
    vi.stubEnv("CONTACT_TO_EMAIL", "doctor@example.com");
    vi.stubEnv("CONTACT_FROM_EMAIL", "MyORL <onboarding@resend.dev>");
  });

  afterEach(() => {
    resetContactEnvCacheForTesting();
    vi.unstubAllEnvs();
    vi.clearAllMocks();
  });

  it("returns 400 for invalid payloads", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const response = await POST(
      new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify({ locale: "ru", name: "x" }),
      }),
    );

    expect(response.status).toBe(400);
  });

  it("returns 503 when email is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "");
    resetContactEnvCacheForTesting();

    const { POST } = await import("@/app/api/contact/route");
    const response = await POST(
      new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        body: JSON.stringify({
          locale: "ru",
          name: "Maria Ivanova",
          email: "maria@example.com",
          phone: "+30 694 000 0000",
          message: "Please call me back about an appointment.",
          company: "",
        }),
      }),
    );

    expect(response.status).toBe(503);
  });

  it("returns 200 for valid contact submissions", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const response = await POST(
      new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { referer: "https://myorl.example.com/ru/epikoinonia" },
        body: JSON.stringify({
          locale: "ru",
          name: "Maria Ivanova",
          email: "maria@example.com",
          phone: "+30 694 000 0000",
          message: "Please call me back about an appointment.",
          company: "",
        }),
      }),
    );

    expect(response.status).toBe(200);
    await expect(response.json()).resolves.toEqual({ ok: true, id: "email-1" });
  });

  it("returns 200 for valid appointment submissions", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const { sendContactEmail } = await import("@/lib/contact/send-contact-email");
    const response = await POST(
      new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { referer: "https://myorl.example.com/ru/zapis" },
        body: JSON.stringify({
          locale: "ru",
          name: "Maria Ivanova",
          email: "",
          phone: "+30 694 000 0000",
          message: "",
          formType: "appointment",
          preferredDate: "2026-06-19",
          preferredSlot: "09:30",
          company: "",
        }),
      }),
    );

    expect(response.status).toBe(200);
    expect(vi.mocked(sendContactEmail)).toHaveBeenCalledWith(
      expect.objectContaining({
        payload: expect.objectContaining({
          formType: "appointment",
          preferredDate: "2026-06-19",
          preferredSlot: "09:30",
        }),
      }),
    );
  });

  it("returns 200 for appointment submissions with empty message", async () => {
    const { POST } = await import("@/app/api/contact/route");
    const response = await POST(
      new NextRequest("http://localhost:3000/api/contact", {
        method: "POST",
        headers: { referer: "https://myorl.example.com/ru/zapis" },
        body: JSON.stringify({
          locale: "ru",
          name: "Maria Ivanova",
          email: "",
          phone: "+30 694 000 0000",
          message: "",
          formType: "appointment",
          preferredDate: "2026-06-19",
          preferredSlot: "09:00",
          company: "",
        }),
      }),
    );

    expect(response.status).toBe(200);
  });
});
