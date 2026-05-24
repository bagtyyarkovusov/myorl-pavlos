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

    rootsRef.current.forEach((root) => {
      root.unmount();
    });
    rootsRef.current = [];

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
      rootsRef.current.forEach((root) => {
        root.unmount();
      });
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
