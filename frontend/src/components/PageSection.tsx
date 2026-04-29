import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageSectionHeading = {
  eyebrow?: string;
  title: string;
  intro?: string;
  action?: ReactNode;
};

type PageSectionBackground = "default" | "surface" | "ink-dark";
type PageSectionRhythm = "standard" | "hero" | "compact" | "contact";
type PageSectionContainerWidth = "full" | "tight" | "prose";

type PageSectionProps = {
  heading?: PageSectionHeading;
  header?: ReactNode;
  background?: PageSectionBackground;
  rhythm?: PageSectionRhythm;
  containerWidth?: PageSectionContainerWidth;
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

const RHYTHM_CLASSES: Record<PageSectionRhythm, string> = {
  standard: "py-20 md:py-32",
  hero: "pt-[clamp(60px,8vw,120px)] pb-[clamp(54px,7vw,96px)]",
  compact: "py-12 md:py-16",
  contact: "py-[clamp(80px,10vw,160px)]",
};

const CONTAINER_CLASSES: Record<PageSectionContainerWidth, string> = {
  full: "container mx-auto",
  tight: "max-w-5xl mx-auto w-[min(1024px,calc(100vw-48px))]",
  prose: "max-w-3xl mx-auto w-[min(820px,calc(100vw-48px))]",
};

export function PageSection({
  heading,
  header,
  background = "default",
  rhythm = "standard",
  containerWidth = "full",
  className,
  label,
  id,
  ariaLabelledBy,
  children,
}: PageSectionProps) {
  const sectionClass = cn(BACKGROUND_CLASSES[background], RHYTHM_CLASSES[rhythm], className);

  const containerClass = cn(CONTAINER_CLASSES[containerWidth], "px-0");

  return (
    <section id={id} className={sectionClass} aria-label={label} aria-labelledby={ariaLabelledBy}>
      <div className={containerClass}>
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
    </section>
  );
}
