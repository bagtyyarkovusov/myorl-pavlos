import { ImageResponse } from "next/og";

import type { Locale } from "@/lib/cms/types";

/**
 * Shared renderer for file-based Open Graph image conventions
 * (`app/[locale]/opengraph-image.tsx` and `app/[locale]/[slug]/opengraph-image.tsx`).
 *
 * Editors override per-page by setting `seo.ogImage` in Strapi — which is
 * surfaced through `openGraph.images` in `toPageMetadata()`. When `ogImage`
 * is absent, Next.js falls back to the file convention rendered here.
 *
 * The card uses the brand palette from `globals.css` so the dynamic fallback
 * stays visually consistent with the rest of the site.
 */

export const size = { width: 1200, height: 630 } as const;
export const contentType = "image/png" as const;
export const alt = "MyORL — ENT and facial surgery practice in Athens" as const;

// Brand palette mirrored from `frontend/src/app/globals.css`. `ImageResponse`
// cannot resolve CSS custom properties, so the hex values are inlined here.
const COLORS = {
  ink: "#0f2a4a",
  inkSoft: "#1b3a63",
  bone: "#f6f8fb",
  stone: "#5a6b7e",
  trust: "#2563a8",
  trustInk: "#17406f",
} as const;

type RenderOpts = {
  title: string;
  description?: string | null;
  locale: Locale;
};

export function renderOgImage({ title, description, locale }: RenderOpts) {
  const truncatedTitle = title.length > 100 ? `${title.slice(0, 97)}…` : title;
  const truncatedDescription =
    description && description.length > 160 ? `${description.slice(0, 157)}…` : description;
  const titleFontSize = truncatedTitle.length > 60 ? 56 : 72;

  return new ImageResponse(
    <div
      style={{
        width: "100%",
        height: "100%",
        background: COLORS.bone,
        display: "flex",
        flexDirection: "column",
        justifyContent: "space-between",
        padding: "80px",
        fontFamily: "system-ui, -apple-system, sans-serif",
      }}
    >
      {/* Top: brand mark */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        <div
          style={{
            width: "8px",
            height: "48px",
            background: COLORS.trust,
          }}
        />
        <div
          style={{
            color: COLORS.ink,
            fontSize: "32px",
            fontWeight: 600,
            letterSpacing: "-0.01em",
          }}
        >
          MyORL
        </div>
      </div>

      {/* Middle: title + optional description */}
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "20px",
        }}
      >
        <div
          style={{
            fontSize: titleFontSize,
            fontWeight: 700,
            color: COLORS.ink,
            lineHeight: 1.1,
            letterSpacing: "-0.02em",
            maxWidth: "1000px",
          }}
        >
          {truncatedTitle}
        </div>
        {truncatedDescription ? (
          <div
            style={{
              fontSize: "24px",
              color: COLORS.stone,
              lineHeight: 1.4,
              maxWidth: "1000px",
            }}
          >
            {truncatedDescription}
          </div>
        ) : null}
      </div>

      {/* Bottom: domain + locale */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          color: COLORS.stone,
          fontSize: "20px",
          borderTop: `2px solid ${COLORS.trust}`,
          paddingTop: "24px",
        }}
      >
        <div>myorl.gr</div>
        <div
          style={{
            textTransform: "uppercase",
            letterSpacing: "0.1em",
            fontWeight: 600,
            color: COLORS.trustInk,
          }}
        >
          {locale}
        </div>
      </div>
    </div>,
    { ...size },
  );
}
