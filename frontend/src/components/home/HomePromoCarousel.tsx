"use client";

import { useRef } from "react";
import Link from "next/link";
import { motion, useScroll, useTransform } from "framer-motion";
import { MediaFrame } from "@/components/design-system";
import type { PromoSlideItemDTO } from "@/lib/cms/sections";
import { cn } from "@/lib/utils";

type HomePromoCarouselProps = {
  title: string;
  slides: PromoSlideItemDTO[];
  locale: string;
};

export function HomePromoCarousel({ title, slides, locale }: HomePromoCarouselProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  if (slides.length === 0) return null;

  return (
    <section className="bg-[var(--background)] py-24 md:py-32 overflow-hidden">
      <div className="container mx-auto mb-12 md:mb-16">
        <h2 className="font-display text-4xl text-[var(--ink)] md:text-5xl lg:text-6xl">{title}</h2>
      </div>

      {/* Full bleed wrapper */}
      <div className="w-full">
        <div
          ref={containerRef}
          className="flex w-full snap-x snap-mandatory gap-6 overflow-x-auto overflow-y-hidden px-6 pb-12 pt-4 scrollbar-hide md:gap-10 md:px-[calc((100vw-min(1280px,100vw-48px))/2)]"
          style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}
        >
          {slides.map((slide, index) => {
            const href =
              slide.targetUrl ??
              (slide.targetPage?.slug ? `/${locale}/${slide.targetPage.slug}` : null);
            const isLink = Boolean(href);

            const cardContent = (
              <div className="group flex h-full flex-col overflow-hidden rounded-[2rem] bg-white shadow-xl shadow-[var(--stone-line)]/50 transition-transform duration-500 hover:-translate-y-2">
                <div className="relative aspect-[4/3] w-full overflow-hidden bg-[var(--surface-soft)] sm:aspect-[16/10]">
                  {slide.image ? (
                    <MediaFrame
                      media={slide.image}
                      alt={slide.title || "Procedure"}
                      variant="wide"
                    />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center font-mono text-sm text-[var(--stone-soft)]">
                      Image
                    </div>
                  )}
                  {/* Subtle overlay gradient */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[var(--ink)]/40 to-transparent opacity-0 transition-opacity duration-500 group-hover:opacity-100" />
                </div>
                <div className="flex flex-1 flex-col p-8 md:p-10">
                  <h3 className="mb-4 font-display text-2xl text-[var(--ink)] md:text-3xl">
                    {slide.title}
                  </h3>
                  {slide.description ? (
                    <p className="mb-8 text-[var(--muted)] leading-relaxed">{slide.description}</p>
                  ) : null}
                  {isLink ? (
                    <span className="mt-auto inline-flex items-center gap-2 font-semibold text-[var(--accent)] uppercase tracking-wide text-sm">
                      Learn More{" "}
                      <span
                        className="transition-transform duration-300 group-hover:translate-x-1"
                        aria-hidden="true"
                      >
                        →
                      </span>
                    </span>
                  ) : null}
                </div>
              </div>
            );

            const containerClasses =
              "w-[85vw] shrink-0 snap-center sm:w-[60vw] lg:w-[45vw] xl:w-[40vw]";

            if (isLink && href) {
              return (
                <Link key={index} href={href} className={containerClasses}>
                  {cardContent}
                </Link>
              );
            }

            return (
              <div key={index} className={containerClasses}>
                {cardContent}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
