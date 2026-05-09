"use client";

import { motion, type Transition } from "framer-motion";
import { useSyncExternalStore, type ReactNode } from "react";

type MotionSectionProps = {
  id?: string;
  className?: string;
  label?: string;
  ariaLabelledBy?: string;
  background?: string;
  density?: string;
  children: ReactNode;
};

const TRANSITION: Transition = {
  duration: 0.5,
  ease: "easeOut",
};

export function MotionSection({
  id,
  className,
  label,
  ariaLabelledBy,
  background,
  density,
  children,
}: MotionSectionProps) {
  const shouldAnimate = useDesktopMotion();
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const animate = mounted && shouldAnimate;

  return (
    <motion.section
      id={id}
      className={className}
      aria-label={label}
      aria-labelledby={ariaLabelledBy}
      data-background={background}
      data-density={density}
      data-motion={animate ? "desktop" : "instant"}
      initial={animate ? { opacity: 0, y: 20 } : false}
      whileInView={animate ? { opacity: 1, y: 0 } : undefined}
      viewport={animate ? { once: true } : undefined}
      transition={animate ? TRANSITION : { duration: 0 }}
    >
      {children}
    </motion.section>
  );
}

// PRD #103 final motion contract: scroll-triggered fade-up runs only above the
// desktop breakpoint (>1024px). Below that, sections render to final state
// immediately. `prefers-reduced-motion: reduce` disables motion at any width.
const DESKTOP_QUERY = "(min-width: 1024px)";
const REDUCED_QUERY = "(prefers-reduced-motion: reduce)";

function useDesktopMotion(): boolean {
  return useSyncExternalStore(subscribeMotion, getMotionSnapshot, () => false);
}

function getMotionSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return window.matchMedia(DESKTOP_QUERY).matches && !window.matchMedia(REDUCED_QUERY).matches;
}

function subscribeMotion(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }

  const desktop = window.matchMedia(DESKTOP_QUERY);
  const reduced = window.matchMedia(REDUCED_QUERY);

  desktop.addEventListener("change", callback);
  reduced.addEventListener("change", callback);

  return () => {
    desktop.removeEventListener("change", callback);
    reduced.removeEventListener("change", callback);
  };
}
