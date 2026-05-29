"use client";

import { useRouter } from "next/navigation";
import { useCallback, type MouseEvent } from "react";

type ViewTransitionNavigateOptions = {
  getMinHeightElement?: () => HTMLElement | null;
};

function prefersReducedMotion(): boolean {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function lockElementHeight(element: HTMLElement): () => void {
  const previousMinHeight = element.style.minHeight;
  element.style.minHeight = `${element.offsetHeight}px`;
  return () => {
    element.style.minHeight = previousMinHeight;
  };
}

export function useViewTransitionNavigate(options: ViewTransitionNavigateOptions = {}) {
  const router = useRouter();
  const { getMinHeightElement } = options;

  return useCallback(
    (href: string, event?: MouseEvent<HTMLElement>) => {
      if (
        event &&
        (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.button !== 0)
      ) {
        return;
      }

      event?.preventDefault();

      const navigate = () => router.push(href);

      if (prefersReducedMotion() || typeof document.startViewTransition !== "function") {
        navigate();
        return;
      }

      const listElement = getMinHeightElement?.() ?? null;
      const unlockHeight = listElement ? lockElementHeight(listElement) : null;

      const transition = document.startViewTransition(navigate);
      transition.finished.finally(() => {
        unlockHeight?.();
      });
    },
    [router, getMinHeightElement],
  );
}
