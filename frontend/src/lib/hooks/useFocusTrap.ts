"use client";

import { useEffect, useRef } from "react";

const TABBABLE_SELECTOR = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  '[tabindex]:not([tabindex="-1"])',
].join(", ");

function getTabbables(container: HTMLElement): HTMLElement[] {
  return Array.from(container.querySelectorAll(TABBABLE_SELECTOR)).filter(
    (el): el is HTMLElement => el instanceof HTMLElement,
  );
}

/**
 * Traps focus inside a container while `enabled` is true.
 *
 * Tab / Shift+Tab cycles between the first and last tabbable elements.
 * When disabled, focus is optionally restored to the previously focused element.
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement | null>,
  enabled: boolean,
  options: { restoreFocus?: boolean } = {},
): void {
  const previouslyFocusedRef = useRef<Element | null>(null);

  useEffect(() => {
    if (!enabled) return;

    previouslyFocusedRef.current = document.activeElement;
    const container = containerRef.current;
    if (!container) return;

    const tabbables = getTabbables(container);
    const first = tabbables[0];
    const last = tabbables[tabbables.length - 1];

    function onKeyDown(event: KeyboardEvent) {
      if (event.key !== "Tab") return;

      if (tabbables.length === 0) {
        event.preventDefault();
        return;
      }

      if (event.shiftKey) {
        if (document.activeElement === first) {
          event.preventDefault();
          last?.focus();
        }
      } else {
        if (document.activeElement === last) {
          event.preventDefault();
          first?.focus();
        }
      }
    }

    container.addEventListener("keydown", onKeyDown);

    return () => {
      container.removeEventListener("keydown", onKeyDown);
      if (options.restoreFocus !== false) {
        (previouslyFocusedRef.current as HTMLElement | null)?.focus();
      }
    };
  }, [enabled, options.restoreFocus, containerRef]);
}
