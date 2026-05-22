export const CONTACT_ATTACHMENT_MAX_BYTES = 5 * 1024 * 1024;

const ALLOWED_EXTENSIONS = new Set(["pdf", "jpg", "jpeg", "png", "heic", "heif"]);

const ALLOWED_MIME_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/heic",
  "image/heif",
]);

export type ContactAttachment = {
  filename: string;
  contentType: string;
  content: Buffer;
};

export type ContactAttachmentError = "attachment_too_large" | "invalid_attachment_type";

type AttachmentCandidate = {
  name: string;
  type: string;
  size: number;
  arrayBuffer(): Promise<ArrayBuffer>;
};

export function extensionFromFilename(filename: string): string {
  const parts = filename.trim().toLowerCase().split(".");
  return parts.length > 1 ? (parts.at(-1) ?? "") : "";
}

export function isAllowedAttachmentType(filename: string, mimeType: string): boolean {
  const extension = extensionFromFilename(filename);
  if (ALLOWED_EXTENSIONS.has(extension)) {
    return true;
  }
  return ALLOWED_MIME_TYPES.has(mimeType.trim().toLowerCase());
}

export async function readContactAttachment(
  file: AttachmentCandidate,
): Promise<
  { ok: true; attachment: ContactAttachment } | { ok: false; error: ContactAttachmentError }
> {
  if (file.size <= 0) {
    return { ok: false, error: "invalid_attachment_type" };
  }

  if (file.size > CONTACT_ATTACHMENT_MAX_BYTES) {
    return { ok: false, error: "attachment_too_large" };
  }

  if (!isAllowedAttachmentType(file.name, file.type)) {
    return { ok: false, error: "invalid_attachment_type" };
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const contentType = file.type.trim() || mimeTypeFromExtension(extensionFromFilename(file.name));

  return {
    ok: true,
    attachment: {
      filename: sanitizeFilename(file.name),
      contentType,
      content: bytes,
    },
  };
}

function mimeTypeFromExtension(extension: string): string {
  switch (extension) {
    case "pdf":
      return "application/pdf";
    case "jpg":
    case "jpeg":
      return "image/jpeg";
    case "png":
      return "image/png";
    case "heic":
      return "image/heic";
    case "heif":
      return "image/heif";
    default:
      return "application/octet-stream";
  }
}

function sanitizeFilename(value: string): string {
  const base = value.split(/[/\\]/).pop()?.trim() || "attachment";
  return base.replace(/[^\w.\-()+\s]/g, "_").slice(0, 180) || "attachment";
}
