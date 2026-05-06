import { beforeEach, describe, expect, it, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";

import { HomeVideoTheater } from "./HomeVideoTheater";

beforeEach(() => {
  // jsdom does not implement HTMLMediaElement.play/pause/paused
  let isPaused = false;
  Object.defineProperty(HTMLMediaElement.prototype, "play", {
    configurable: true,
    value: vi.fn().mockImplementation(() => {
      isPaused = false;
      return Promise.resolve();
    }),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "pause", {
    configurable: true,
    value: vi.fn().mockImplementation(() => {
      isPaused = true;
    }),
  });
  Object.defineProperty(HTMLMediaElement.prototype, "paused", {
    configurable: true,
    get: () => isPaused,
  });
});

const baseProps = {
  title: "Video Title",
  intro: "Video intro text",
  videos: [
    {
      videoMp4: {
        url: "https://example.com/video.mp4",
        width: 1920,
        height: 1080,
        alternativeText: null,
      },
      videoWebm: null,
      thumbnail: {
        url: "https://example.com/thumb.jpg",
        width: 800,
        height: 600,
        alternativeText: null,
      },
    },
  ],
  ctaLabel: "Watch",
  ctaHref: "/el/video",
};

describe("HomeVideoTheater", () => {
  it("renders a video element when video source is available", () => {
    const { container } = render(<HomeVideoTheater {...baseProps} />);
    expect(container.querySelector("video")).not.toBeNull();
  });

  it("renders a pause/play button", () => {
    render(<HomeVideoTheater {...baseProps} />);
    const button = screen.getByRole("button", { name: /pause video/i });
    expect(button).toBeDefined();
  });

  it("toggles play/pause on button click", () => {
    render(<HomeVideoTheater {...baseProps} />);
    const button = screen.getByRole("button", { name: /pause video/i });
    fireEvent.click(button);
    expect(screen.getByRole("button", { name: /play video/i })).toBeDefined();
  });

  it("returns null when no videos are provided", () => {
    const { container } = render(<HomeVideoTheater {...baseProps} videos={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("disables autoplay when prefers-reduced-motion is true", () => {
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: vi.fn().mockImplementation((query: string) => ({
        matches: query === "(prefers-reduced-motion: reduce)",
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    });

    const { container } = render(<HomeVideoTheater {...baseProps} />);
    const video = container.querySelector("video");
    expect(video).not.toBeNull();
    expect(video?.hasAttribute("autoplay")).toBe(false);
  });
});
