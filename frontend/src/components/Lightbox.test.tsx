import { describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { Lightbox } from "./Lightbox";
import type { MediaDTO } from "@/lib/cms/types";

const IMAGES: MediaDTO[] = [
  { url: "/img/photo-1.jpg", alternativeText: "Photo 1", width: 800, height: 600 },
  { url: "/img/photo-2.jpg", alternativeText: "Photo 2", width: 800, height: 600 },
  { url: "/img/photo-3.jpg", alternativeText: "Photo 3", width: 800, height: 600 },
];

describe("Lightbox", () => {
  it("renders an overlay with the current image", () => {
    const onClose = vi.fn();
    render(<Lightbox images={IMAGES} initialIndex={0} onClose={onClose} />);

    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(screen.getByAltText("Photo 1")).toBeTruthy();
  });

  it("closes when Escape is pressed", () => {
    const onClose = vi.fn();
    render(<Lightbox images={IMAGES} initialIndex={0} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("navigates to next image with right arrow", () => {
    const onClose = vi.fn();
    render(<Lightbox images={IMAGES} initialIndex={0} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByAltText("Photo 2")).toBeTruthy();
  });

  it("navigates to previous image with left arrow", () => {
    const onClose = vi.fn();
    render(<Lightbox images={IMAGES} initialIndex={1} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowLeft" });
    expect(screen.getByAltText("Photo 1")).toBeTruthy();
  });

  it("wraps around at the end", () => {
    const onClose = vi.fn();
    render(<Lightbox images={IMAGES} initialIndex={2} onClose={onClose} />);

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "ArrowRight" });
    expect(screen.getByAltText("Photo 1")).toBeTruthy();
  });

  it("closes when clicking the backdrop", () => {
    const onClose = vi.fn();
    render(<Lightbox images={IMAGES} initialIndex={0} onClose={onClose} />);

    const backdrop = screen.getByRole("dialog");
    fireEvent.click(backdrop);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("does not close when clicking the image itself", () => {
    const onClose = vi.fn();
    render(<Lightbox images={IMAGES} initialIndex={0} onClose={onClose} />);

    const img = screen.getByAltText("Photo 1");
    fireEvent.click(img);
    expect(onClose).not.toHaveBeenCalled();
  });

  it("renders close button", () => {
    const onClose = vi.fn();
    render(<Lightbox images={IMAGES} initialIndex={0} onClose={onClose} />);

    const closeBtn = screen.getByRole("button", { name: /close/i });
    expect(closeBtn).toBeTruthy();
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("traps focus: Tab from last button cycles to first", () => {
    render(<Lightbox images={IMAGES} initialIndex={0} onClose={vi.fn()} />);

    const dialog = screen.getByRole("dialog");
    const buttons = screen.getAllByRole("button");
    const last = buttons[buttons.length - 1]!;
    last.focus();

    fireEvent.keyDown(dialog, { key: "Tab" });

    expect(document.activeElement).toBe(buttons[0]);
  });
});
