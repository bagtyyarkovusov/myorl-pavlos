"use client";

import { motion, type Transition } from "framer-motion";
import { useEffect, useState, type ReactNode } from "react";

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

  return (
    <motion.section
      id={id}
      className={className}
      aria-label={label}
      aria-labelledby={ariaLabelledBy}
      data-background={background}
      data-density={density}
      data-motion={shouldAnimate ? "desktop" : "instant"}
      initial={shouldAnimate ? { opacity: 0, y: 20 } : false}
      whileInView={shouldAnimate ? { opacity: 1, y: 0 } : undefined}
      viewport={shouldAnimate ? { once: true } : undefined}
      transition={shouldAnimate ? TRANSITION : { duration: 0 }}
    >
      {children}
    </motion.section>
  );
}

function useDesktopMotion(): boolean {
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    if (typeof window.matchMedia !== "function") {
      return;
    }

    const desktop = window.matchMedia("(min-width: 768px)");
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      setEnabled(desktop.matches && !reduced.matches);
    };

    update();
    desktop.addEventListener("change", update);
    reduced.addEventListener("change", update);

    return () => {
      desktop.removeEventListener("change", update);
      reduced.removeEventListener("change", update);
    };
  }, []);

  return enabled;
}
