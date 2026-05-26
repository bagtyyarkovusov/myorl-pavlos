import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Extract the "YYYY-MM-DD" date portion from an ISO 8601 datetime string. */
export function formatIsoDate(value?: string | null): string | null {
  if (!value) return null;
  return value.slice(0, 10);
}
