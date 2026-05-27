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

function scheduleRootUnmount(roots: Root[]): void {
  const snapshot = [...roots];
  queueMicrotask(() => {
    for (const root of snapshot) {
      try {
        root.unmount();
      } catch {
        // Placeholder nodes may already be gone after innerHTML updates.
      }
    }
  });
}

export function CmsHtmlEnhancer({
  html,
  className,
  "data-variant": dataVariant,
  playLabel,
}: CmsHtmlEnhancerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const rootsRef = useRef<Root[]>([]);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const placeholders = container.querySelectorAll<HTMLElement>("[data-cms-youtube]");
    placeholders.forEach((placeholder) => {
      const videoId = placeholder.getAttribute("data-cms-youtube");
      if (!videoId) {
        return;
      }
      const title = placeholder.getAttribute("data-cms-title") ?? "Video";
      const root = createRoot(placeholder);
      root.render(
        <LiteYouTube videoId={videoId} title={title} playLabel={playLabel} variant="full" />,
      );
      rootsRef.current.push(root);
    });

    return () => {
      scheduleRootUnmount(rootsRef.current);
      rootsRef.current = [];
    };
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
