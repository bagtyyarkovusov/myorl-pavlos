import { describe, expect, it, vi } from "vitest";

import {
  CONTACT_ATTACHMENT_MAX_BYTES,
  isAllowedAttachmentType,
  readContactAttachment,
} from "@/lib/contact/contact-attachment";
import { parseContactRequest } from "@/lib/contact/parse-contact-request";
import { NextRequest } from "next/server";

describe("contact attachment validation", () => {
  it("accepts allowed file types", () => {
    expect(isAllowedAttachmentType("report.pdf", "application/pdf")).toBe(true);
    expect(isAllowedAttachmentType("photo.jpg", "image/jpeg")).toBe(true);
    expect(isAllowedAttachmentType("scan.heic", "")).toBe(true);
  });

  it("rejects unsupported file types", () => {
    expect(isAllowedAttachmentType("virus.exe", "application/octet-stream")).toBe(false);
  });

  it("rejects files above the size limit", async () => {
    const result = await readContactAttachment({
      name: "large.pdf",
      type: "application/pdf",
      size: CONTACT_ATTACHMENT_MAX_BYTES + 1,
      arrayBuffer: async () => new ArrayBuffer(1),
    });

    expect(result).toEqual({ ok: false, error: "attachment_too_large" });
  });

  it("accepts a valid attachment buffer", async () => {
    const bytes = new TextEncoder().encode("%PDF-1.4");
    const result = await readContactAttachment({
      name: "report.pdf",
      type: "application/pdf",
      size: bytes.byteLength,
      arrayBuffer: async () =>
        bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
    });

    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.attachment.filename).toBe("report.pdf");
      expect(result.attachment.content.toString()).toContain("%PDF-1.4");
    }
  });
});

describe("parseContactRequest multipart", () => {
  it("parses form fields and optional attachment", async () => {
    const formData = new FormData();
    formData.append("locale", "ru");
    formData.append("name", "Maria Ivanova");
    formData.append("email", "maria@example.com");
    formData.append("phone", "+30 694 000 0000");
    formData.append("message", "Please call me back about an appointment.");
    formData.append("company", "");
    formData.append(
      "attachment",
      new File(["%PDF-1.4"], "report.pdf", { type: "application/pdf" }),
    );

    const request = new NextRequest("http://localhost:3000/api/contact", {
      method: "POST",
    });
    vi.spyOn(request.headers, "get").mockImplementation((name) =>
      name === "content-type" ? "multipart/form-data; boundary=----test" : null,
    );
    vi.spyOn(request, "formData").mockResolvedValue(formData);

    const parsed = await parseContactRequest(request);
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.data.name).toBe("Maria Ivanova");
      expect(parsed.attachment?.filename).toBe("report.pdf");
    }
  });
});
