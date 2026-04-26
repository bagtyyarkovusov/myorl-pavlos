export function normalizeOptionalText(value: string | null | undefined): string | null {
  const normalized = (value ?? "").trim();
  return normalized ? normalized : null;
}

export function optionalString(value: unknown): string | null {
  return typeof value === "string" ? normalizeOptionalText(value) : null;
}
