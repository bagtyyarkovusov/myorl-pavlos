"use client";

import { useState } from "react";
import Image from "next/image";
import dynamic from "next/dynamic";

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
};

export function GalleryWithLightbox({ items, className, itemClassName }: GalleryWithLightboxProps) {
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  const images = items
    .map((item) => item.image)
    .filter((img): img is MediaDTO => img != null && img.url != null);

  return (
    <>
      <div className={className}>
        {items.map((item, index) => {
          const hasImage = item.image?.url != null;
          return (
            <article className={itemClassName} key={`${item.caption ?? "image"}-${index}`}>
              {hasImage ? (
                <button
                  type="button"
                  data-gallery-trigger
                  onClick={() => {
                    const imgIndex = images.findIndex((img) => img.url === item.image!.url);
                    setLightboxIndex(imgIndex >= 0 ? imgIndex : 0);
                  }}
                  style={{ all: "unset", cursor: "pointer", display: "block", width: "100%" }}
                >
                  <Image
                    src={item.image!.url}
                    alt={item.image!.alternativeText ?? item.caption ?? ""}
                    width={item.image!.width ?? 960}
                    height={item.image!.height ?? 640}
                    sizes="(min-width: 960px) 33vw, (min-width: 640px) 50vw, 100vw"
                    style={{ width: "100%", height: "auto", borderRadius: 8 }}
                  />
                </button>
              ) : null}
              {item.caption ? <h3>{item.caption}</h3> : null}
            </article>
          );
        })}
      </div>

      {lightboxIndex !== null ? (
        <Lightbox
          images={images}
          initialIndex={lightboxIndex}
          onClose={() => setLightboxIndex(null)}
        />
      ) : null}
    </>
  );
}
