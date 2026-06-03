"use client";

import { useCallback, useRef, useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

import type { LightboxImage } from "@/components/Lightbox";
import { useOverlayLifecycle } from "@/lib/motion/useOverlayLifecycle";
import type { MediaDTO } from "@/lib/cms/types";

const Lightbox = dynamic(() => import("@/components/Lightbox").then((m) => m.Lightbox), {
  ssr: false,
});

type GalleryItem = {
  caption?: string | null;
  image?: MediaDTO | null;
};

type GalleryWithLightboxProps = {
  items: GalleryItem[];
  className?: string;
  itemClassName?: string;
  variant?: "grid" | "clinic";
};

export function GalleryWithLightbox({
  items,
  className,
  itemClassName,
  variant = "grid",
}: GalleryWithLightboxProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);
  const lastTriggerRef = useRef<HTMLButtonElement | null>(null);

  const restoreFocus = useCallback(() => {
    setLightboxIndex(null);
    window.setTimeout(() => {
      lastTriggerRef.current?.focus();
    }, 0);
  }, []);

  const { shouldRender, dataState, overlayRef, requestClose } = useOverlayLifecycle({
    isOpen: lightboxIndex !== null,
    onClosed: restoreFocus,
  });

  const images = items
    .map((item): LightboxImage | null =>
      item.image?.url ? { ...item.image, caption: item.caption } : null,
    )
    .filter((img): img is LightboxImage => img !== null);

  if (images.length === 0) return null;

  return (
    <>
      <div className={className} data-gallery-grid>
        {items.map((item, index) => {
          const hasImage = item.image?.url != null;
          const isClinic = variant === "clinic";
          return (
            <article
              className={itemClassName}
              key={`${item.caption ?? "image"}-${index}`}
              {...(isClinic ? { "data-clinic-strip-item": "" } : {})}
            >
              {hasImage ? (
                <button
                  type="button"
                  data-gallery-trigger
                  data-gallery-variant={variant}
                  onClick={(event) => {
                    lastTriggerRef.current = event.currentTarget;
                    const imgIndex = images.findIndex((img) => img.url === item.image!.url);
                    setLightboxIndex(imgIndex >= 0 ? imgIndex : 0);
                  }}
                  style={
                    isClinic
                      ? undefined
                      : { all: "unset", cursor: "pointer", display: "block", width: "100%" }
                  }
                >
                  {isClinic ? (
                    <Image
                      src={item.image!.url}
                      alt={item.image!.alternativeText ?? item.caption ?? ""}
                      fill
                      sizes="(min-width: 960px) 20vw, (min-width: 640px) 33vw, 50vw"
                      style={{ objectFit: "cover" }}
                    />
                  ) : (
                    <Image
                      src={item.image!.url}
                      alt={item.image!.alternativeText ?? item.caption ?? ""}
                      width={item.image!.width ?? 960}
                      height={item.image!.height ?? 640}
                      sizes="(min-width: 960px) 33vw, (min-width: 640px) 50vw, 100vw"
                      style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    />
                  )}
                </button>
              ) : null}
              {item.caption ? <h3 data-gallery-caption>{item.caption}</h3> : null}
            </article>
          );
        })}
      </div>

      {shouldRender && lightboxIndex !== null ? (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={requestClose}
          dataState={dataState}
          overlayRef={overlayRef}
        />
      ) : null}
    </>
  );
}
