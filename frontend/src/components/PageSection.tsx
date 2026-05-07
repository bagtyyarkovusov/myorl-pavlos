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
type PageSectionRhythm = "standard" | "hero" | "compact" | "contact";
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
  standard: "py-20 md:py-32",
  hero: "pt-[clamp(60px,8vw,120px)] pb-[clamp(54px,7vw,96px)]",
  compact: "py-12 md:py-16",
  contact: "py-[clamp(80px,10vw,160px)]",
};

const DENSITY_RHYTHM_CLASSES: Record<Density, string> = {
  scanning: "py-[var(--section-padding-scanning)]",
  focused: "py-[var(--section-padding-focused)]",
  theater: "py-[var(--section-padding-theater)]",
};

const CONTAINER_CLASSES: Record<PageSectionContainerWidth, string> = {
  full: "container mx-auto",
  tight: "max-w-5xl mx-auto w-[min(1024px,calc(100vw-48px))]",
  prose: "max-w-3xl mx-auto w-[min(820px,calc(100vw-48px))]",
};

const WIDTH_CLASSES: Record<PageSectionWidth, string> = {
  "full-bleed": "w-full",
  contained: "container mx-auto",
  narrow: "max-w-3xl mx-auto w-[min(768px,calc(100vw-48px))]",
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
    "px-0",
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
          <header className="mb-16 md:mb-24 flex flex-col md:flex-row md:items-end justify-between gap-8">
            <div>
              {heading.eyebrow ? (
                <p className="mb-3 font-mono text-xs font-medium uppercase tracking-[0.04em] text-stone-soft">
                  {heading.eyebrow}
                </p>
              ) : null}
              <h2 className="max-w-2xl font-display text-4xl leading-tight text-ink md:text-5xl lg:text-6xl">
                {heading.title}
              </h2>
            </div>
            {heading.action ??
              (heading.intro ? (
                <p className="max-w-xl text-lg text-stone">{heading.intro}</p>
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
