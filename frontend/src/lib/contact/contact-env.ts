import "server-only";

import { z } from "zod";

const contactEnvSchema = z.object({
  resendApiKey: z.string().trim().min(1),
  contactToEmail: z.string().trim().email(),
  contactFromEmail: z.string().trim().min(3),
});

export type ContactEnv = z.infer<typeof contactEnvSchema>;

let cached: ContactEnv | null = null;

/**
 * Validates contact-form email delivery env vars.
 * Returns null when Resend is not configured (form UI still renders; submit returns 503).
 */
export function getContactEnv(): ContactEnv | null {
  if (cached) {
    return cached;
  }

  const parsed = contactEnvSchema.safeParse({
    resendApiKey: process.env.RESEND_API_KEY,
    contactToEmail: process.env.CONTACT_TO_EMAIL ?? "pavlos.tsolaridis@gmail.com",
    contactFromEmail: process.env.CONTACT_FROM_EMAIL ?? "MyORL Contact <onboarding@resend.dev>",
  });

  if (!parsed.success) {
    return null;
  }

  cached = parsed.data;
  return cached;
}

/** Clears cached env — for tests only. */
export function resetContactEnvCacheForTesting(): void {
  cached = null;
}
