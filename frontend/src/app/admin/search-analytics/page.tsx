import Link from "next/link";

import { query } from "@/lib/db";

type Props = {
  searchParams?: Promise<{ locale?: string | string[] | undefined }>;
};

export const dynamic = "force-dynamic";

const VALID_LOCALES = ["el", "ru"] as const;
const LIMIT = 20;

interface QueryRow {
  query: string;
  locale: string;
  count: string;
}

function localeFilterClause(locale: string | undefined): {
  clause: string;
  params: string[];
} {
  if (locale && VALID_LOCALES.includes(locale as (typeof VALID_LOCALES)[number])) {
    return { clause: "AND locale = $1", params: [locale] };
  }
  return { clause: "", params: [] };
}

export default async function SearchAnalyticsPage({ searchParams }: Props) {
  const params = await searchParams;
  const selectedLocale =
    typeof params?.locale === "string" ? params.locale : undefined;

  const { clause, params: localeParams } = localeFilterClause(selectedLocale);

  const topSql = `
    SELECT query, locale, COUNT(*)::text AS count
    FROM search_query_log
    WHERE created_at >= NOW() - INTERVAL '30 days'
      AND result_count > 0
      ${clause}
    GROUP BY query, locale
    ORDER BY count DESC
    LIMIT ${LIMIT}
  `;

  const zeroSql = `
    SELECT query, locale, COUNT(*)::text AS count
    FROM search_query_log
    WHERE created_at >= NOW() - INTERVAL '30 days'
      AND result_count = 0
      ${clause}
    GROUP BY query, locale
    ORDER BY count DESC
    LIMIT ${LIMIT}
  `;

  const [topResult, zeroResult] = await Promise.all([
    query(topSql, localeParams),
    query(zeroSql, localeParams),
  ]);

  const topQueries = topResult.rows as unknown as QueryRow[];
  const zeroQueries = zeroResult.rows as unknown as QueryRow[];

  return (
    <div style={{ maxWidth: "960px", margin: "0 auto", padding: "2rem 1rem", fontFamily: "system-ui, sans-serif" }}>
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>
        Search Analytics
      </h1>

      <LocaleTabs selected={selectedLocale} />

      <section style={{ marginTop: "2rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Top Queries (Last 30 Days)
        </h2>
        {topQueries.length > 0 ? (
          <QueryTable rows={topQueries} />
        ) : (
          <EmptyState />
        )}
      </section>

      <section style={{ marginTop: "2.5rem" }}>
        <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
          Zero-Result Queries (Last 30 Days)
        </h2>
        {zeroQueries.length > 0 ? (
          <QueryTable rows={zeroQueries} />
        ) : (
          <p style={{ color: "#666" }}>No zero-result queries in this period.</p>
        )}
      </section>
    </div>
  );
}

function LocaleTabs({ selected }: { selected?: string }) {
  const tabs = [
    { label: "All", href: "/admin/search-analytics" },
    { label: "el", href: "/admin/search-analytics?locale=el" },
    { label: "ru", href: "/admin/search-analytics?locale=ru" },
  ];

  return (
    <nav style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
      {tabs.map((tab) => {
        const isActive = (tab.label === "All" && !selected) || tab.label === selected;
        return (
          <Link
            key={tab.label}
            href={tab.href}
            aria-current={isActive ? "page" : undefined}
            style={{
              padding: "0.375rem 0.75rem",
              borderRadius: "4px",
              textDecoration: "none",
              fontSize: "0.875rem",
              fontWeight: isActive ? 600 : 400,
              background: isActive ? "#e2e8f0" : "transparent",
              color: isActive ? "#1a202c" : "#4a5568",
              border: isActive ? "1px solid #cbd5e0" : "1px solid transparent",
            }}
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}

function QueryTable({ rows }: { rows: QueryRow[] }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
          <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600 }}>Query</th>
          <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600 }}>Locale</th>
          <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 600 }}>Count</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr
            key={`${row.query}-${row.locale}`}
            style={{ borderBottom: "1px solid #edf2f7" }}
          >
            <td style={{ padding: "0.5rem 0.75rem" }}>{row.query}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>{row.locale}</td>
            <td style={{ padding: "0.5rem 0.75rem", textAlign: "right", fontVariantNumeric: "tabular-nums" }}>
              {row.count}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState() {
  return (
    <p style={{ color: "#666" }}>
      No search query data yet. Once visitors start searching, top queries will appear here.
    </p>
  );
}
