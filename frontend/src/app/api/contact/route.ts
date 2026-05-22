import { NextRequest, NextResponse } from "next/server";

import { getContactEnv } from "@/lib/contact/contact-env";
import { parseContactRequest } from "@/lib/contact/parse-contact-request";
import { sendContactEmail } from "@/lib/contact/send-contact-email";
import { getCmsConfig } from "@/lib/cms/env";

export async function POST(request: NextRequest) {
  const parsed = await parseContactRequest(request);
  if (!parsed.ok) {
    if (parsed.error === "spam") {
      return NextResponse.json({ ok: true });
    }
    return NextResponse.json({ ok: false, error: parsed.error }, { status: 400 });
  }

  const env = getContactEnv();
  if (!env) {
    return NextResponse.json({ ok: false, error: "email_not_configured" }, { status: 503 });
  }

  const referer = request.headers.get("referer");
  const pageUrl = referer ?? getCmsConfig().siteUrl;

  const result = await sendContactEmail({
    env,
    payload: parsed.data,
    pageUrl,
    attachment: parsed.attachment,
  });

  if (!result.ok) {
    return NextResponse.json({ ok: false, error: result.reason }, { status: 502 });
  }

  return NextResponse.json({ ok: true, id: result.id });
}
