"use client";

import { useState, useCallback, useEffect, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { CmsHtml } from "@/components/CmsHtml";
import { MediaFrame } from "@/components/design-system";
import { PageSection } from "@/components/PageSection";
import type { PromoSlideItemDTO } from "@/lib/cms/types";

import styles from "./HomePromoCarousel.module.css";

type HomePromoCarouselProps = {
  title: string;
  intro?: string | null;
  slides: PromoSlideItemDTO[];
  locale: string;
  learnMoreLabel: string;
};

const AUTOPLAY_INTERVAL_MS = 6500;

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

const reducedSlideTransition = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

export function HomePromoCarousel({
  title,
  slides,
  locale,
  learnMoreLabel,
}: HomePromoCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  /** After any explicit user control, interval autoplay stops until the component remounts (e.g. revisit page). */
  const [autoplayEnabled, setAutoplayEnabled] = useState(true);
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);
  const isPausedRef = useRef(false);
  const tabRefs = useRef<Array<HTMLElement | null>>([]);
  const systemPrefersReducedMotion = useReducedMotion();

  /** false during SSR + hydration, then true — avoids branching on `useReducedMotion()` before commit. */
  const hasMounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  /** Avoid hydration mismatch: `useReducedMotion()` is null on the server but boolean on the client. */
  const shouldReduceMotion = Boolean(hasMounted && systemPrefersReducedMotion);

  const totalSlides = slides.length;

  const stopAutoplayForever = useCallback(() => setAutoplayEnabled(false), []);

  const goTo = useCallback(
    (index: number) => {
      stopAutoplayForever();
      if (index === currentIndex || totalSlides === 0) return;
      setDirection(index > currentIndex ? 1 : -1);
      setCurrentIndex(index);
    },
    [currentIndex, stopAutoplayForever, totalSlides],
  );

  const goNext = useCallback(() => {
    if (totalSlides <= 1) return;
    stopAutoplayForever();
    setDirection(1);
    setCurrentIndex((prev) => (prev + 1) % totalSlides);
  }, [stopAutoplayForever, totalSlides]);

  const goPrev = useCallback(() => {
    if (totalSlides <= 1) return;
    stopAutoplayForever();
    setDirection(-1);
    setCurrentIndex((prev) => (prev - 1 + totalSlides) % totalSlides);
  }, [stopAutoplayForever, totalSlides]);

  useEffect(() => {
    if (totalSlides <= 1 || shouldReduceMotion || !autoplayEnabled) return;

    const intervalId = window.setInterval(() => {
      if (isPausedRef.current) return;

      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % totalSlides);
    }, AUTOPLAY_INTERVAL_MS);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [autoplayEnabled, shouldReduceMotion, totalSlides]);

  useEffect(() => {
    const currentTab = tabRefs.current[currentIndex];
    const rail = currentTab?.parentElement;
    if (!currentTab || !rail) return;
    if (typeof rail.scrollTo !== "function") return;

    const target = currentTab.offsetLeft - rail.clientWidth / 2 + currentTab.clientWidth / 2;
    rail.scrollTo({
      left: Math.max(0, target),
      behavior: shouldReduceMotion ? "auto" : "smooth",
    });
  }, [currentIndex, shouldReduceMotion]);

  function handleCarouselKeyDown(event: React.KeyboardEvent<HTMLDivElement>) {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      goPrev();
    } else if (event.key === "ArrowRight") {
      event.preventDefault();
      goNext();
    }
  }

  function handlePointerDown(event: React.PointerEvent<HTMLElement>) {
    if (totalSlides <= 1 || event.pointerType === "mouse") return;
    isPausedRef.current = true;
    dragStartRef.current = { x: event.clientX, y: event.clientY };
  }

  function handlePointerUp(event: React.PointerEvent<HTMLElement>) {
    const start = dragStartRef.current;
    dragStartRef.current = null;
    isPausedRef.current = false;
    if (!start) return;

    const deltaX = event.clientX - start.x;
    const deltaY = event.clientY - start.y;
    const navigated = Math.abs(deltaX) >= 48 && Math.abs(deltaX) >= Math.abs(deltaY) * 1.35;

    if (navigated) {
      if (deltaX < 0) {
        goNext();
      } else {
        goPrev();
      }
    } else if (event.pointerType !== "mouse") {
      stopAutoplayForever();
    }
  }

  function handlePointerCancel() {
    dragStartRef.current = null;
    isPausedRef.current = false;
  }

  function handleCarouselBlur(event: React.FocusEvent<HTMLDivElement>) {
    if (event.currentTarget.contains(event.relatedTarget)) return;
    isPausedRef.current = false;
  }

  if (totalSlides === 0) return null;

  const currentSlide = slides[currentIndex]!;
  const currentDescription = currentSlide.description ?? currentSlide.targetPageExcerpt ?? null;
  const mosaicSlides = slides.map((slide, index) => ({ slide, index }));
  const visibleMosaicSlides = mosaicSlides.slice(0, 16);
  const mosaicClassName =
    mosaicSlides.length > 0
      ? styles["topic-mosaic"]
      : `${styles["topic-mosaic"]} ${styles["topic-mosaic--solo"]}`;
  const href = getSlideHref(currentSlide, locale);

  return (
    <PageSection rhythm="compact" className={styles["topic-section"]} header={null}>
      <div
        className={styles["topic-directory"]}
        role="region"
        aria-label={title}
        aria-roledescription="carousel"
        onKeyDown={handleCarouselKeyDown}
        onMouseEnter={() => {
          isPausedRef.current = true;
        }}
        onMouseLeave={() => {
          isPausedRef.current = false;
        }}
        onFocusCapture={() => {
          isPausedRef.current = true;
        }}
        onBlurCapture={handleCarouselBlur}
      >
        <div className={mosaicClassName}>
          <div
            className={styles["topic-feature"]}
            onPointerCancel={handlePointerCancel}
            onPointerDown={handlePointerDown}
            onPointerUp={handlePointerUp}
          >
            <AnimatePresence custom={direction} mode="wait">
              <motion.article
                id="home-topic-panel"
                key={currentIndex}
                custom={direction}
                variants={shouldReduceMotion ? reducedSlideTransition : slideTransition}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{
                  duration: shouldReduceMotion ? 0.16 : 0.35,
                  ease: [0.16, 1, 0.3, 1],
                }}
                className={styles["topic-feature__inner"]}
                role="tabpanel"
                aria-labelledby={totalSlides > 1 ? `home-topic-tab-${currentIndex}` : undefined}
                aria-live="polite"
              >
                <div className={styles["topic-feature__media"]}>
                  {currentSlide.image ? (
                    <MediaFrame
                      media={currentSlide.image}
                      alt={currentSlide.title || "Procedure"}
                      variant="wide"
                      className={styles["topic-feature__frame"]}
                    />
                  ) : (
                    <div className={styles["media-placeholder"]}>
                      <span>Topic image</span>
                    </div>
                  )}
                  <div className={styles["index-badge"]}>
                    {String(currentIndex + 1).padStart(2, "0")}
                  </div>
                </div>

                <div className={styles["topic-feature__copy"]}>
                  <p className={styles["topic-count"]}>
                    {String(currentIndex + 1).padStart(2, "0")} /{" "}
                    {String(totalSlides).padStart(2, "0")}
                  </p>
                  {currentSlide.title ? <h3>{currentSlide.title}</h3> : null}
                  <CmsHtml className={styles["topic-description"]} html={currentDescription} />
                  {href ? (
                    <Link href={href} className={styles["text-link"]}>
                      {learnMoreLabel}
                      <span aria-hidden="true">→</span>
                    </Link>
                  ) : null}
                </div>
              </motion.article>
            </AnimatePresence>
          </div>

          {visibleMosaicSlides.length > 0 ? (
            <div className={styles["topic-tile-grid"]} aria-label="Promo topics">
              {visibleMosaicSlides.map(({ slide, index }) => (
                <PromoTile
                  key={`${slide.title ?? "slide"}-${index}`}
                  index={index}
                  slide={slide}
                  isActive={index === currentIndex}
                  onClick={() => goTo(index)}
                />
              ))}
            </div>
          ) : null}
        </div>

        {totalSlides > 1 ? (
          <div className={styles["topic-controls"]}>
            <button
              type="button"
              onClick={goPrev}
              className={styles["round-button"]}
              aria-label="Previous slide"
            >
              <ChevronLeftIcon />
            </button>

            <div className={styles["topic-rail"]} role="tablist" aria-label="Slide navigation">
              {slides.map((_, index) => {
                const isActive = index === currentIndex;
                const slide = slides[index]!;
                return (
                  <button
                    key={index}
                    id={`home-topic-tab-${index}`}
                    ref={(node) => {
                      tabRefs.current[index] = node;
                    }}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    aria-controls="home-topic-panel"
                    aria-label={`Slide ${index + 1}: ${slide.title ?? "Untitled topic"}`}
                    onClick={() => goTo(index)}
                    className={isActive ? styles["topic-tab--active"] : styles["topic-tab"]}
                  >
                    <span className={styles["topic-tab__thumb"]}>
                      {slide.image ? (
                        <MediaFrame
                          media={slide.image}
                          alt=""
                          variant="wide"
                          className={styles["topic-tab__frame"]}
                        />
                      ) : (
                        <span className={styles["topic-tab__placeholder"]} aria-hidden="true" />
                      )}
                    </span>
                    <span className={styles["topic-tab__index"]}>
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <strong>{slide.title ?? "Untitled topic"}</strong>
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={goNext}
              className={styles["round-button"]}
              aria-label="Next slide"
            >
              <ChevronRightIcon />
            </button>
          </div>
        ) : null}

        {totalSlides > 1 ? (
          <div className={styles["topic-progress"]}>
            {slides.map((slide, index) => (
              <button
                key={`${slide.title ?? "progress"}-${index}`}
                type="button"
                aria-current={index === currentIndex ? "true" : undefined}
                aria-label={`Go to slide ${index + 1}: ${slide.title ?? "Untitled topic"}`}
                className={
                  index === currentIndex
                    ? styles["topic-progress__bar--active"]
                    : styles["topic-progress__bar"]
                }
                onClick={() => goTo(index)}
                tabIndex={-1}
              />
            ))}
          </div>
        ) : null}
      </div>
    </PageSection>
  );
}

function PromoTile({
  index,
  slide,
  isActive,
  onClick,
}: {
  index: number;
  slide: PromoSlideItemDTO;
  isActive: boolean;
  onClick: () => void;
}) {
  const label = `View slide ${index + 1}: ${slide.title ?? "Untitled topic"}`;
  const tileClassName = isActive
    ? `${styles["topic-tile"]} ${styles["topic-tile--active"]}`
    : styles["topic-tile"];

  return (
    <div className={tileClassName}>
      <button
        type="button"
        className={styles["topic-tile__button"]}
        onClick={onClick}
        aria-controls="home-topic-panel"
        aria-current={isActive ? "true" : undefined}
        aria-label={label}
      >
        {slide.image ? (
          <MediaFrame
            media={slide.image}
            alt=""
            variant="wide"
            className={styles["topic-tile__frame"]}
          />
        ) : (
          <div className={styles["media-placeholder"]}>
            <span>Topic image</span>
          </div>
        )}
      </button>
      <span className={styles["topic-tile__ribbon"]}>
        <span>{String(index + 1).padStart(2, "0")}</span>
        <strong>{slide.title ?? "Untitled topic"}</strong>
      </span>
    </div>
  );
}

function getSlideHref(slide: PromoSlideItemDTO, locale: string): string | null {
  return slide.targetUrl ?? (slide.targetPage?.slug ? `/${locale}/${slide.targetPage.slug}` : null);
}

function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
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
      width="16"
      height="16"
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
