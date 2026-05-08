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

function useDesktopMotion(): boolean {
  const enabled = useSyncExternalStore(subscribeMotion, getMotionSnapshot, () => false);

  return enabled;
}

function getMotionSnapshot(): boolean {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return false;
  }
  return (
    window.matchMedia("(min-width: 768px)").matches &&
    !window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}

function subscribeMotion(callback: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }

  const desktop = window.matchMedia("(min-width: 768px)");
  const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

  desktop.addEventListener("change", callback);
  reduced.addEventListener("change", callback);

  return () => {
    desktop.removeEventListener("change", callback);
    reduced.removeEventListener("change", callback);
  };
}
