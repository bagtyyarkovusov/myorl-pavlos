export const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SESSION_KEY = "search_session_id";

export function getSessionId(): string {
  if (typeof window === "undefined") return "";

  try {
    const existing = sessionStorage.getItem(SESSION_KEY);
    if (existing) return existing;

    const id = crypto.randomUUID();
    sessionStorage.setItem(SESSION_KEY, id);
    return id;
  } catch {
    return "";
  }
}
