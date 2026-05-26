import Link from "next/link";

import { query } from "@/lib/db";

type Props = {
  searchParams?: Promise<{
    locale?: string | string[] | undefined;
    device_type?: string | string[] | undefined;
  }>;
};

export const dynamic = "force-dynamic";

const VALID_LOCALES = ["el", "ru"] as const;
const VALID_DEVICE_TYPES = ["mobile", "desktop", "tablet"] as const;
const LIMIT = 20;
const METRICS = ["LCP", "CLS", "INP"] as const;

interface P75Row {
  path: string;
  device_type: string;
  p75: string;
  sample_count: string;
}

interface DailyP75Row {
  day: string;
  p75: string;
  sample_count: string;
}

function filterClauses(
  locale: string | undefined,
  deviceType: string | undefined,
): {
  clauses: string;
  params: string[];
} {
  const clauses: string[] = [];
  const params: string[] = [];

  if (locale && VALID_LOCALES.includes(locale as (typeof VALID_LOCALES)[number])) {
    params.push(locale);
    clauses.push(`AND locale = $${params.length}`);
  }

  if (
    deviceType &&
    VALID_DEVICE_TYPES.includes(deviceType as (typeof VALID_DEVICE_TYPES)[number])
  ) {
    params.push(deviceType);
    clauses.push(`AND device_type = $${params.length}`);
  }

  return { clauses: clauses.join(" "), params };
}

function p75Sql(
  metric: string,
  locale: string | undefined,
  deviceType: string | undefined,
): {
  sql: string;
  params: string[];
} {
  const { clauses, params } = filterClauses(locale, deviceType);
  const sql = `
    SELECT
      path,
      device_type,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY value)::numeric(10,1) AS p75,
      COUNT(*)::text AS sample_count
    FROM web_vitals_log
    WHERE metric = '${metric}'
      AND created_at >= NOW() - INTERVAL '30 days'
      ${clauses}
    GROUP BY path, device_type
    ORDER BY p75 DESC
    LIMIT ${LIMIT}
  `;
  return { sql, params };
}

function dailyP75Sql(
  metric: string,
  locale: string | undefined,
  deviceType: string | undefined,
): {
  sql: string;
  params: string[];
} {
  const { clauses, params } = filterClauses(locale, deviceType);
  const sql = `
    SELECT
      DATE(created_at)::text AS day,
      percentile_cont(0.75) WITHIN GROUP (ORDER BY value)::numeric(10,1) AS p75,
      COUNT(*)::text AS sample_count
    FROM web_vitals_log
    WHERE metric = '${metric}'
      AND created_at >= NOW() - INTERVAL '30 days'
      ${clauses}
    GROUP BY DATE(created_at)
    ORDER BY day DESC
    LIMIT 30
  `;
  return { sql, params };
}

export default async function WebVitalsAdminPage({ searchParams }: Props) {
  const params = await searchParams;
  const selectedLocale = typeof params?.locale === "string" ? params.locale : undefined;
  const selectedDevice = typeof params?.device_type === "string" ? params.device_type : undefined;

  const pathQueries = METRICS.map((metric) => {
    const { sql, params: qParams } = p75Sql(metric, selectedLocale, selectedDevice);
    return query(sql, qParams);
  });

  const dailyQueries = METRICS.map((metric) => {
    const { sql, params: qParams } = dailyP75Sql(metric, selectedLocale, selectedDevice);
    return query(sql, qParams);
  });

  const [pathResults, dailyResults] = await Promise.all([
    Promise.all(pathQueries),
    Promise.all(dailyQueries),
  ]);

  const pathData: Record<string, P75Row[]> = {};
  const dailyData: Record<string, DailyP75Row[]> = {};
  METRICS.forEach((metric, i) => {
    const pr = pathResults[i];
    pathData[metric] = (pr?.rows as unknown as P75Row[]) ?? [];
    const dr = dailyResults[i];
    dailyData[metric] = (dr?.rows as unknown as DailyP75Row[]) ?? [];
  });

  const hasAnyData =
    Object.values(pathData).some((rows) => rows.length > 0) ||
    Object.values(dailyData).some((rows) => rows.length > 0);

  return (
    <div
      style={{
        maxWidth: "960px",
        margin: "0 auto",
        padding: "2rem 1rem",
        fontFamily: "system-ui, sans-serif",
      }}
    >
      <h1 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "1.5rem" }}>Web Vitals</h1>

      <FilterTabs selectedLocale={selectedLocale} selectedDevice={selectedDevice} />

      {!hasAnyData ? (
        <EmptyState />
      ) : (
        <>
          {METRICS.map((metric) => (
            <section key={metric} style={{ marginTop: "2.5rem" }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                p75 {metric} by Path (Last 30 Days)
              </h2>
              {(pathData[metric]?.length ?? 0) > 0 ? (
                <P75Table rows={pathData[metric]!} metric={metric} />
              ) : (
                <p style={{ color: "#666" }}>No {metric} data in this period.</p>
              )}
            </section>
          ))}

          {METRICS.map((metric) => (
            <section key={`daily-${metric}`} style={{ marginTop: "2.5rem" }}>
              <h2 style={{ fontSize: "1.125rem", fontWeight: 600, marginBottom: "0.75rem" }}>
                p75 {metric} by Day (Last 30 Days)
              </h2>
              {(dailyData[metric]?.length ?? 0) > 0 ? (
                <DailyTable rows={dailyData[metric]!} metric={metric} />
              ) : (
                <p style={{ color: "#666" }}>No daily {metric} data in this period.</p>
              )}
            </section>
          ))}
        </>
      )}
    </div>
  );
}

function FilterTabs({
  selectedLocale,
  selectedDevice,
}: {
  selectedLocale?: string;
  selectedDevice?: string;
}) {
  const localeTabs = [
    { label: "All", href: buildFilterUrl(undefined, selectedDevice) },
    { label: "el", href: buildFilterUrl("el", selectedDevice) },
    { label: "ru", href: buildFilterUrl("ru", selectedDevice) },
  ];

  const deviceTabs = [
    { label: "All", href: buildFilterUrl(selectedLocale, undefined) },
    { label: "Desktop", href: buildFilterUrl(selectedLocale, "desktop") },
    { label: "Mobile", href: buildFilterUrl(selectedLocale, "mobile") },
    { label: "Tablet", href: buildFilterUrl(selectedLocale, "tablet") },
  ];

  const tabStyle = (isActive: boolean) => ({
    padding: "0.375rem 0.75rem",
    borderRadius: "4px",
    textDecoration: "none",
    fontSize: "0.875rem",
    fontWeight: isActive ? 600 : 400,
    background: isActive ? "#e2e8f0" : "transparent",
    color: isActive ? "#1a202c" : "#4a5568",
    border: isActive ? "1px solid #cbd5e0" : "1px solid transparent",
  });

  return (
    <div>
      <nav style={{ display: "flex", gap: "0.5rem", marginBottom: "0.75rem" }}>
        {localeTabs.map((tab) => {
          const isActive = (tab.label === "All" && !selectedLocale) || tab.label === selectedLocale;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              style={tabStyle(isActive)}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
      <nav style={{ display: "flex", gap: "0.5rem", marginBottom: "1rem" }}>
        {deviceTabs.map((tab) => {
          const isActive =
            (tab.label === "All" && !selectedDevice) || tab.label.toLowerCase() === selectedDevice;
          return (
            <Link
              key={tab.label}
              href={tab.href}
              aria-current={isActive ? "page" : undefined}
              style={tabStyle(isActive)}
            >
              {tab.label}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

function buildFilterUrl(locale?: string, deviceType?: string): string {
  const params = new URLSearchParams();
  if (locale) params.set("locale", locale);
  if (deviceType) params.set("device_type", deviceType);
  const qs = params.toString();
  return qs ? `/admin/web-vitals?${qs}` : "/admin/web-vitals";
}

function P75Table({ rows, metric }: { rows: P75Row[]; metric: string }) {
  const unit = metric === "CLS" ? "" : "ms";

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
          <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600 }}>Path</th>
          <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600 }}>Device</th>
          <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 600 }}>
            p75{unit ? ` (${unit})` : ""}
          </th>
          <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 600 }}>
            Samples
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={`${row.path}-${row.device_type}`} style={{ borderBottom: "1px solid #edf2f7" }}>
            <td style={{ padding: "0.5rem 0.75rem" }}>{row.path}</td>
            <td style={{ padding: "0.5rem 0.75rem" }}>{row.device_type}</td>
            <td
              style={{
                padding: "0.5rem 0.75rem",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.p75}
            </td>
            <td
              style={{
                padding: "0.5rem 0.75rem",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.sample_count}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function DailyTable({ rows, metric }: { rows: DailyP75Row[]; metric: string }) {
  const unit = metric === "CLS" ? "" : "ms";

  return (
    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.875rem" }}>
      <thead>
        <tr style={{ borderBottom: "2px solid #e2e8f0" }}>
          <th style={{ textAlign: "left", padding: "0.5rem 0.75rem", fontWeight: 600 }}>Day</th>
          <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 600 }}>
            p75{unit ? ` (${unit})` : ""}
          </th>
          <th style={{ textAlign: "right", padding: "0.5rem 0.75rem", fontWeight: 600 }}>
            Samples
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.day} style={{ borderBottom: "1px solid #edf2f7" }}>
            <td style={{ padding: "0.5rem 0.75rem" }}>{row.day}</td>
            <td
              style={{
                padding: "0.5rem 0.75rem",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.p75}
            </td>
            <td
              style={{
                padding: "0.5rem 0.75rem",
                textAlign: "right",
                fontVariantNumeric: "tabular-nums",
              }}
            >
              {row.sample_count}
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

function EmptyState() {
  return (
    <p style={{ color: "#666", marginTop: "2rem" }}>
      No web vitals data yet. Once visitors start browsing, metrics will appear here.
    </p>
  );
}
