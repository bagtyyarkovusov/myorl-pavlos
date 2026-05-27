import type { ReactNode } from "react";

import type { Density } from "@/lib/cms/density";
import { cn } from "@/lib/utils";
import { MotionSection } from "./MotionSection";

type PageSectionHeading = {
  eyebrow?: string;
  title: string;
  intro?: string;
  action?: ReactNode;
};

type PageSectionBackground = "default" | "surface" | "ink-dark";
type PageSectionRhythm = "standard" | "hero" | "compact" | "page";
type PageSectionContainerWidth = "full" | "tight" | "prose";
type PageSectionWidth = "full-bleed" | "contained" | "narrow";

type PageSectionProps = {
  heading?: PageSectionHeading;
  header?: ReactNode;
  background?: PageSectionBackground;
  rhythm?: PageSectionRhythm;
  containerWidth?: PageSectionContainerWidth;
  sectionIndex?: number;
  density?: Density;
  width?: PageSectionWidth;
  className?: string;
  label?: string;
  id?: string;
  ariaLabelledBy?: string;
  children: ReactNode;
};

const BACKGROUND_CLASSES: Record<PageSectionBackground, string> = {
  default: "",
  surface: "bg-bone-50",
  "ink-dark": "bg-ink text-bone-50",
};

const ALTERNATING_BACKGROUND_CLASSES = {
  bone: "bg-bone",
  white: "bg-white",
} as const;

const RHYTHM_CLASSES: Record<PageSectionRhythm, string> = {
  standard: "py-[clamp(3.5rem,calc(2rem+5vw),8rem)]",
  hero: "pt-[var(--page-top-gutter)] pb-[clamp(54px,7vw,96px)]",
  compact: "py-[clamp(2.75rem,calc(1.25rem+3vw),4rem)]",
  page: "pt-[var(--page-top-gutter)] pb-[var(--page-bottom-gutter)]",
};

const DENSITY_RHYTHM_CLASSES: Record<Density, string> = {
  scanning: "py-[var(--section-padding-scanning)]",
  focused: "py-[var(--section-padding-focused)]",
  theater: "py-[var(--section-padding-theater)]",
};

/** Matches globals `.container` max width without the class name (avoids Tailwind/global clashes). */
const SECTION_MAX_ROW = "w-full max-w-[1280px] mx-auto min-w-0";

const PAGE_INLINE_GUTTER = "px-[var(--page-inline-gutter)]";

const CONTAINER_CLASSES: Record<PageSectionContainerWidth, string> = {
  full: SECTION_MAX_ROW,
  tight: "max-w-5xl w-full mx-auto min-w-0",
  prose: "max-w-3xl w-full mx-auto min-w-0",
};

const WIDTH_CLASSES: Record<PageSectionWidth, string> = {
  "full-bleed": "w-full min-w-0",
  contained: SECTION_MAX_ROW,
  narrow: "max-w-3xl w-full mx-auto min-w-0",
};

export function PageSection({
  heading,
  header,
  background = "default",
  rhythm = "standard",
  containerWidth = "full",
  sectionIndex,
  density = "focused",
  width,
  className,
  label,
  id,
  ariaLabelledBy,
  children,
}: PageSectionProps) {
  const alternatingBackground =
    sectionIndex !== undefined ? getAlternatingBackground(sectionIndex) : null;
  const sectionClass = cn(
    alternatingBackground
      ? ALTERNATING_BACKGROUND_CLASSES[alternatingBackground]
      : BACKGROUND_CLASSES[background],
    sectionIndex !== undefined ? DENSITY_RHYTHM_CLASSES[density] : RHYTHM_CLASSES[rhythm],
    className,
  );

  const containerClass = cn(
    width ? WIDTH_CLASSES[width] : CONTAINER_CLASSES[containerWidth],
    PAGE_INLINE_GUTTER,
  );

  return (
    <MotionSection
      id={id}
      className={sectionClass}
      label={label}
      ariaLabelledBy={ariaLabelledBy}
      background={alternatingBackground ?? undefined}
      density={sectionIndex !== undefined ? density : undefined}
    >
      <div className={containerClass} data-width={width}>
        {header !== undefined ? (
          header
        ) : heading ? (
          <header className="mb-[clamp(2.5rem,5vw,6rem)] flex flex-col justify-between gap-6 md:flex-row md:items-end md:gap-8">
            <div className="min-w-0">
              {heading.eyebrow ? (
                <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.04em] text-stone-soft">
                  {heading.eyebrow}
                </p>
              ) : null}
              <h2 className="max-w-2xl text-balance break-words font-display text-[clamp(1.875rem,5.5vw,3.75rem)] leading-[1.12] tracking-tight text-ink">
                {heading.title}
              </h2>
            </div>
            {heading.action ??
              (heading.intro ? (
                <p className="max-w-xl min-w-0 text-base leading-relaxed text-stone sm:text-lg">
                  {heading.intro}
                </p>
              ) : null)}
          </header>
        ) : null}
        {children}
      </div>
    </MotionSection>
  );
}

function getAlternatingBackground(sectionIndex: number): "bone" | "white" {
  return sectionIndex % 2 === 0 ? "bone" : "white";
}
