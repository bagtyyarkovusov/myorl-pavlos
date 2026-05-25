import type { Locale } from "@/lib/cms/types";

export type SearchResultsErrorProps = {
  type: "unavailable" | "network";
  locale: Locale;
  retryPath?: string;
};

type Labels = {
  unavailableTitle: string;
  unavailableBody: string;
  articlesLabel: string;
  videosLabel: string;
  networkTitle: string;
  retry: string;
};

const t: Record<Locale, Labels> = {
  el: {
    unavailableTitle: "Η αναζήτηση είναι προσωρινά μη διαθέσιμη",
    unavailableBody: "Δοκιμάστε ξανά σε λίγο ή περιηγηθείτε απευθείας στο περιεχόμενό μας.",
    articlesLabel: "Άρθρα",
    videosLabel: "Βίντεο",
    networkTitle: "Δεν ήταν δυνατή η σύνδεση.",
    retry: "Επανάληψη",
  },
  ru: {
    unavailableTitle: "Поиск временно недоступен",
    unavailableBody: "Повторите попытку позже или просмотрите содержимое напрямую.",
    articlesLabel: "Статьи",
    videosLabel: "Видео",
    networkTitle: "Не удалось подключиться.",
    retry: "Повторить",
  },
};

export function SearchResultsError({ type, locale, retryPath }: SearchResultsErrorProps) {
  const labels = t[locale];

  if (type === "unavailable") {
    return (
      <div
        role="alert"
        style={{
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: "16px",
          padding: "48px 24px",
          textAlign: "center",
        }}
      >
        <h1 style={{ fontSize: "1.25rem" }}>{labels.unavailableTitle}</h1>
        <p style={{ color: "var(--muted, #666)" }}>{labels.unavailableBody}</p>
        <nav style={{ display: "flex", gap: "12px", marginTop: "8px" }}>
          <a
            href={`/${locale}`}
            style={{
              padding: "8px 20px",
              border: "1px solid var(--accent, #0052cc)",
              borderRadius: "6px",
              color: "var(--accent, #0052cc)",
              textDecoration: "none",
            }}
          >
            {labels.articlesLabel}
          </a>
          <a
            href={`/${locale}/video`}
            style={{
              padding: "8px 20px",
              border: "1px solid var(--accent, #0052cc)",
              borderRadius: "6px",
              color: "var(--accent, #0052cc)",
              textDecoration: "none",
            }}
          >
            {labels.videosLabel}
          </a>
        </nav>
      </div>
    );
  }

  return (
    <div
      role="alert"
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
        padding: "48px 24px",
        textAlign: "center",
      }}
    >
      <p style={{ fontSize: "1.15rem" }}>{labels.networkTitle}</p>
      {retryPath && (
        <a
          href={retryPath}
          style={{
            padding: "8px 24px",
            border: "1px solid var(--accent, #0052cc)",
            borderRadius: "6px",
            color: "var(--accent, #0052cc)",
            textDecoration: "none",
          }}
        >
          {labels.retry}
        </a>
      )}
    </div>
  );
}
