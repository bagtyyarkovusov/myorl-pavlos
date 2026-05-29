"use client";

/* eslint-disable react-hooks/set-state-in-effect -- overlay open/close lifecycle syncs React state with CSS transitionend */
import { useCallback, useEffect, useRef, useState } from "react";

export type OverlayLifecycle = "closed" | "open" | "closing";

export type OverlayDataState = "open" | "closed";

type UseOverlayLifecycleOptions = {
  isOpen: boolean;
  onClosed: () => void;
  /** Max wait before forcing close if transitionend never fires. */
  closeTimeoutMs?: number;
};

function prefersReducedMotion(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

/**
 * Manages overlay mount/unmount so CSS exit transitions can run before onClosed.
 * Maps lifecycle to data-state="open" | "closed" for CSS transitions.
 */
export function useOverlayLifecycle({
  isOpen,
  onClosed,
  closeTimeoutMs = 300,
}: UseOverlayLifecycleOptions) {
  const [lifecycle, setLifecycle] = useState<OverlayLifecycle>(() => (isOpen ? "open" : "closed"));
  const [dataState, setDataState] = useState<OverlayDataState>("closed");
  const overlayRef = useRef<HTMLElement | null>(null);
  const onClosedRef = useRef(onClosed);

  useEffect(() => {
    onClosedRef.current = onClosed;
  }, [onClosed]);

  useEffect(() => {
    if (isOpen) {
      setLifecycle("open");
      return;
    }
    setLifecycle((current) => (current === "closed" ? "closed" : "closing"));
  }, [isOpen]);

  useEffect(() => {
    if (lifecycle === "open") {
      if (prefersReducedMotion()) {
        setDataState("open");
        return;
      }
      setDataState("closed");
      const frame = requestAnimationFrame(() => setDataState("open"));
      return () => cancelAnimationFrame(frame);
    }
    setDataState("closed");
  }, [lifecycle]);

  useEffect(() => {
    if (lifecycle !== "closing") {
      return;
    }

    if (prefersReducedMotion()) {
      setLifecycle("closed");
      onClosedRef.current();
      return;
    }

    const node = overlayRef.current;
    let finished = false;

    const finish = () => {
      if (finished) {
        return;
      }
      finished = true;
      setLifecycle("closed");
      onClosedRef.current();
    };

    const onTransitionEnd = (event: TransitionEvent) => {
      if (event.target !== node || event.propertyName !== "opacity") {
        return;
      }
      finish();
    };

    node?.addEventListener("transitionend", onTransitionEnd);
    const timeoutId = window.setTimeout(finish, closeTimeoutMs);

    return () => {
      finished = true;
      node?.removeEventListener("transitionend", onTransitionEnd);
      window.clearTimeout(timeoutId);
    };
  }, [lifecycle, closeTimeoutMs]);

  const requestClose = useCallback(() => {
    if (prefersReducedMotion()) {
      setLifecycle("closed");
      setDataState("closed");
      onClosedRef.current();
      return;
    }
    setLifecycle("closing");
  }, []);

  const shouldRender = lifecycle !== "closed";

  return {
    lifecycle,
    dataState,
    shouldRender,
    overlayRef,
    requestClose,
  };
}
