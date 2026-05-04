export function paginate<T>(items: T[], page: number, pageSize: number): { slice: T[]; totalPages: number } {
  const safeSize = Math.max(1, Math.floor(pageSize));
  const totalPages = Math.max(1, Math.ceil(items.length / safeSize));
  let safePage = Math.floor(page);
  if (!Number.isFinite(safePage) || safePage < 1) {
    safePage = 1;
  }
  if (safePage > totalPages) {
    safePage = totalPages;
  }
  const start = (safePage - 1) * safeSize;
  return {
    slice: items.slice(start, start + safeSize),
    totalPages,
  };
}

export function parsePageParam(raw: string | string[] | undefined): number {
  const value = Array.isArray(raw) ? raw[0] : raw;
  const n = Number.parseInt(value ?? "1", 10);
  return Number.isFinite(n) && n > 0 ? n : 1;
}
