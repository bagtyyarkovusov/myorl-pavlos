"use client";

import { useEffect, useRef } from "react";
import { createRoot, type Root } from "react-dom/client";

import { LiteYouTube } from "@/components/video/LiteYouTube";

type CmsHtmlEnhancerProps = {
  html: string;
  className?: string;
  "data-variant"?: string;
  playLabel: string;
};

const rootCache = new WeakMap<HTMLElement, Root>();

function unmountRootSafely(root: Root): void {
  try {
    root.unmount();
  } catch {
    // Placeholder nodes may already be gone after innerHTML updates.
  }
}

function getOrCreateRoot(node: HTMLElement): Root {
  const cached = rootCache.get(node);
  if (cached) {
    return cached;
  }

  const root = createRoot(node);
  rootCache.set(node, root);
  return root;
}

/** Unmount only after React finishes the current commit and the node stays detached. */
function scheduleReleaseRoot(node: HTMLElement): void {
  const root = rootCache.get(node);
  if (!root) {
    return;
  }

  queueMicrotask(() => {
    requestAnimationFrame(() => {
      if (node.isConnected) {
        return;
      }

      unmountRootSafely(root);
      rootCache.delete(node);
    });
  });
}

export function CmsHtmlEnhancer({
  html,
  className,
  "data-variant": dataVariant,
  playLabel,
}: CmsHtmlEnhancerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const managedPlaceholdersRef = useRef<Set<HTMLElement>>(new Set());

  useEffect(() => {
    return () => {
      for (const node of managedPlaceholdersRef.current) {
        scheduleReleaseRoot(node);
      }
      managedPlaceholdersRef.current.clear();
    };
  }, []);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const activePlaceholders = new Set<HTMLElement>();
    const placeholders = container.querySelectorAll<HTMLElement>("[data-cms-youtube]");

    placeholders.forEach((placeholder) => {
      const videoId = placeholder.getAttribute("data-cms-youtube");
      if (!videoId) {
        return;
      }

      activePlaceholders.add(placeholder);
      const title = placeholder.getAttribute("data-cms-title") ?? "Video";
      getOrCreateRoot(placeholder).render(
        <LiteYouTube videoId={videoId} title={title} playLabel={playLabel} variant="full" />,
      );
    });

    for (const node of managedPlaceholdersRef.current) {
      if (!activePlaceholders.has(node)) {
        scheduleReleaseRoot(node);
      }
    }

    managedPlaceholdersRef.current = activePlaceholders;
  }, [html, playLabel]);

  return (
    <div
      ref={containerRef}
      className={className}
      data-variant={dataVariant}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
