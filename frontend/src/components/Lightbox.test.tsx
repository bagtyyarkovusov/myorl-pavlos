import { describe, expect, it, vi } from "vitest";
import { createRef } from "react";
import { render, screen, fireEvent } from "@testing-library/react";

import { Lightbox } from "./Lightbox";
import type { MediaDTO } from "@/lib/cms/types";

function renderLightbox(
  props: Omit<React.ComponentProps<typeof Lightbox>, "dataState" | "overlayRef">,
) {
  const overlayRef = createRef<HTMLElement>();
  return render(<Lightbox {...props} dataState="open" overlayRef={overlayRef} />);
}

const IMAGES: MediaDTO[] = [
  { url: "/img/photo-1.jpg", alternativeText: "Photo 1", width: 800, height: 600 },
  { url: "/img/photo-2.jpg", alternativeText: "Photo 2", width: 800, height: 600 },
  { url: "/img/photo-3.jpg", alternativeText: "Photo 3", width: 800, height: 600 },
];

const CAPTIONED_IMAGES = [
  { ...IMAGES[0]!, caption: "Reception area" },
  { ...IMAGES[1]!, caption: "Treatment room" },
  { ...IMAGES[2]!, caption: "Waiting lounge" },
];

describe("Lightbox", () => {
  it("renders an overlay with the current image", () => {
    const onClose = vi.fn();
    renderLightbox({ images: IMAGES, initialIndex: 0, onClose: onClose });

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByAltText("Photo 1")).toBeTruthy();
  });

  it("closes when Escape is pressed", () => {
    const onClose = vi.fn();
    renderLightbox({ images: IMAGES, initialIndex: 0, onClose: onClose });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("navigates to next image with right arrow", () => {
    const onClose = vi.fn();
    renderLightbox({ images: IMAGES, initialIndex: 0, onClose: onClose });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByAltText("Photo 2")).toBeTruthy();
  });

  it("shows the caption for the current image", () => {
    renderLightbox({ images: CAPTIONED_IMAGES, initialIndex: 0, onClose: vi.fn() });

    expect(screen.getByText("Reception area")).toBeTruthy();

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });

    expect(screen.getByText("Treatment room")).toBeTruthy();
  });

  it("navigates by horizontal swipe", () => {
    renderLightbox({ images: IMAGES, initialIndex: 1, onClose: vi.fn() });

    const dialog = screen.getByRole("dialog");
    fireEvent.touchStart(dialog, { touches: [{ clientX: 220, clientY: 40 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 80, clientY: 44 }] });
    expect(screen.getByAltText("Photo 3")).toBeTruthy();

    fireEvent.touchStart(dialog, { touches: [{ clientX: 80, clientY: 44 }] });
    fireEvent.touchEnd(dialog, { changedTouches: [{ clientX: 230, clientY: 42 }] });
    expect(screen.getByAltText("Photo 2")).toBeTruthy();
  });

  it("navigates to previous image with left arrow", () => {
    const onClose = vi.fn();
    renderLightbox({ images: IMAGES, initialIndex: 1, onClose: onClose });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(screen.getByAltText("Photo 1")).toBeTruthy();
  });

  it("wraps around at the end", () => {
    const onClose = vi.fn();
    renderLightbox({ images: IMAGES, initialIndex: 2, onClose: onClose });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByAltText("Photo 1")).toBeTruthy();
  });

  it("closes when clicking the backdrop", () => {
    const onClose = vi.fn();
    renderLightbox({ images: IMAGES, initialIndex: 0, onClose: onClose });

    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking the image itself", () => {
    const onClose = vi.fn();
    renderLightbox({ images: IMAGES, initialIndex: 0, onClose: onClose });

    const img = screen.getByAltText("Photo 1");
    fireEvent.click(img);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders close button", () => {
    const onClose = vi.fn();
    renderLightbox({ images: IMAGES, initialIndex: 0, onClose: onClose });

    const closeBtn = screen.getByRole("button", { name: /close/i });
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps focus: Tab from last button cycles to first", () => {
    renderLightbox({ images: IMAGES, initialIndex: 0, onClose: vi.fn() });

    const dialog = screen.getByRole("dialog");
    const buttons = screen.getAllByRole("button");
    const last = buttons[buttons.length - 1]!;
    last.focus();

    fireEvent.keyDown(dialog, { key: "Tab" });

    expect(document.activeElement).toBe(buttons[0]);
  });
});
