"use client";

import type { ReactNode } from "react";

type MotionSectionProps = {
  id?: string;
  className?: string;
  label?: string;
  ariaLabelledBy?: string;
  background?: string;
  density?: string;
  children: ReactNode;
};

/** Section shell with layout data attributes. Entrance motion disabled site-wide (PRODUCT.md #5). */
export function MotionSection({
  id,
  className,
  label,
  ariaLabelledBy,
  background,
  density,
  children,
}: MotionSectionProps) {
  return (
    <section
      id={id}
      className={className}
      aria-label={label}
      aria-labelledby={ariaLabelledBy}
      data-background={background}
      data-density={density}
      data-motion="instant"
    >
      {children}
    </section>
  );
}
