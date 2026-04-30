"use client";

import { useState, useCallback, useEffect } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { MediaFrame } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import type { PromoSlideItemDTO } from "@/lib/cms/types";

import styles from "./home.module.css";

type HomePromoCarouselProps = {
  title: string;
  intro?: string | null;
  slides: PromoSlideItemDTO[];
  locale: string;
  learnMoreLabel: string;
};

const slideTransition = {
  enter: (direction: number) => ({
    x: direction > 0 ? 40 : -40,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (direction: number) => ({
    x: direction < 0 ? 40 : -40,
    opacity: 0,
  }),
};

export function HomePromoCarousel({
  title,
  intro,
  slides,
  locale,
  learnMoreLabel,
}: HomePromoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);

  const totalSlides = slides.length;

  const goTo = useCallback(
    (index: number) => {
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
    },
    [currentIndex],
  );

  const goNext = useCallback(() => {
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [totalSlides]);

  const goPrev = useCallback(() => {
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "ArrowLeft") {
        goPrev();
      } else if (e.key === "ArrowRight") {
        goNext();
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [goNext, goPrev]);

  if (totalSlides === 0) return null;

  const currentSlide = slides[currentIndex]!;
  const href =
    currentSlide.targetUrl ??
    (currentSlide.targetPage?.slug ? `/${locale}/${currentSlide.targetPage.slug}` : null);

  return (
    <PageSection heading={{ title, intro: intro ?? undefined }}>
      <div
        className="mx-auto max-w-5xl"
        role="region"
        aria-label={title}
        aria-roledescription="carousel"
      >
        <div className="relative overflow-hidden rounded-[2rem] border border-stone-line bg-bone-50 shadow-lg shadow-stone-line/20">
          <AnimatePresence custom={direction} mode="wait">
            <motion.div
              key={currentIndex}
              custom={direction}
              variants={slideTransition}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
              className="flex flex-col md:grid md:grid-cols-[1fr_1fr]"
            >
              <div className={`${styles["media-surface"]} md:aspect-auto`}>
                {currentSlide.image ? (
                  <MediaFrame
                    media={currentSlide.image}
                    alt={currentSlide.title || "Procedure"}
                    variant="wide"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <span className="font-mono text-xs uppercase tracking-widest text-stone-soft">
                      Image
                    </span>
                  </div>
                )}
                <div className={styles["index-badge"]}>{String(currentIndex + 1).padStart(2, "0")}</div>
              </div>

              <div className="flex flex-col justify-center p-6 md:p-10 lg:p-12">
                {currentSlide.title ? (
                  <h3 className="mb-4 font-display text-xl leading-tight text-ink md:text-2xl lg:text-3xl">
                    {currentSlide.title}
                  </h3>
                ) : null}

                {currentSlide.description ? (
                  <p className="mb-6 line-clamp-5 text-sm leading-relaxed text-stone md:text-base">
                    {currentSlide.description}
                  </p>
                ) : null}

                {href ? (
                  <Link
                    href={href}
                    className="mt-2 inline-flex items-center gap-2 self-start text-sm font-semibold tracking-wide text-trust transition-colors hover:text-trust-ink"
                  >
                    {learnMoreLabel}
                    <span
                      aria-hidden="true"
                      className="text-lg leading-none transition-transform duration-300 group-hover:translate-x-1"
                    >
                      →
                    </span>
                  </Link>
                ) : null}
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {totalSlides > 1 ? (
          <div className="mt-8 flex items-center justify-center gap-3 md:gap-4">
            <button
              type="button"
              onClick={goPrev}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-line bg-bone-50 text-stone transition-all hover:border-trust hover:text-trust focus:outline-none focus-visible:ring-2 focus-visible:ring-trust/30"
              aria-label="Previous slide"
            >
              <ChevronLeftIcon />
            </button>

            <div className="flex items-center gap-2" role="tablist" aria-label="Slide navigation">
              {slides.map((_, index) => {
                const isActive = index === currentIndex;
                return (
                  <button
                    key={index}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-label={`Slide ${index + 1}`}
                    onClick={() => goTo(index)}
                    className={`
                      relative flex h-9 w-9 items-center justify-center rounded-full font-mono text-xs font-semibold tracking-wider transition-all duration-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-trust/30
                      ${
                        isActive
                          ? "bg-trust text-bone-50 shadow-md"
                          : "bg-transparent text-stone-soft hover:bg-bone-200 hover:text-ink"
                      }
                    `}
                  >
                    {String(index + 1).padStart(2, "0")}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={goNext}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-stone-line bg-bone-50 text-stone transition-all hover:border-trust hover:text-trust focus:outline-none focus-visible:ring-2 focus-visible:ring-trust/30"
              aria-label="Next slide"
            >
              <ChevronRightIcon />
            </button>
          </div>
        ) : null}
      </div>
    </PageSection>
  );
}

function ChevronLeftIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  );
}

function ChevronRightIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
