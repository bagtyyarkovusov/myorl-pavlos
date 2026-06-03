import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { GalleryWithLightbox } from "./GalleryWithLightbox";
import type { MediaDTO } from "@/lib/cms/types";

const ITEMS = [
  {
    caption: "Photo 1",
    image: { url: "/img/1.jpg", alternativeText: "Image 1", width: 800, height: 600 } as MediaDTO,
  },
  {
    caption: "Photo 2",
    image: { url: "/img/2.jpg", alternativeText: "Image 2", width: 800, height: 600 } as MediaDTO,
  },
];

beforeEach(() => {
  vi.stubEnv("STRAPI_URL", "http://localhost:1337");
  vi.stubEnv("NEXT_PUBLIC_SITE_URL", "https://myorl.example.com");
  vi.stubGlobal(
    "matchMedia",
    vi.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    })),
  );
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.unstubAllGlobals();
});

describe("GalleryWithLightbox", () => {
  it("renders gallery items as clickable buttons", () => {
    render(<GalleryWithLightbox items={ITEMS} />);
    const buttons = screen.getAllByRole("button");
    expect(buttons).toHaveLength(2);
  });

  it("opens lightbox with correct image when an item is clicked", async () => {
    render(<GalleryWithLightbox items={ITEMS} />);

    const firstButton = screen.getAllByRole("button")[0]!;
    fireEvent.click(firstButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });
    const dialog = screen.getByRole("dialog");
    expect(dialog.querySelector('img[alt="Image 1"]')).toBeTruthy();
    expect(within(dialog).getByText("Photo 1")).toBeTruthy();
  });

  it("closes lightbox when Escape is pressed", async () => {
    render(<GalleryWithLightbox items={ITEMS} />);

    fireEvent.click(screen.getAllByRole("button")[0]!);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
  });

  it("does not render lightbox initially", () => {
    render(<GalleryWithLightbox items={ITEMS} />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("returns focus to the clicked gallery image when the lightbox closes", async () => {
    render(<GalleryWithLightbox items={ITEMS} />);

    const firstButton = screen.getAllByRole("button")[0]!;
    fireEvent.click(firstButton);

    await waitFor(() => {
      expect(screen.getByRole("dialog")).toBeTruthy();
    });

    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).toBeNull();
    });
    await waitFor(() => {
      expect(document.activeElement).toBe(firstButton);
    });
  });

  it("uses a gallery grid with hidden grid captions", () => {
    const { container } = render(<GalleryWithLightbox items={ITEMS} />);

    expect(container.querySelector("[data-gallery-grid]")).toBeTruthy();
    expect(container.querySelectorAll("[data-gallery-caption]")).toHaveLength(2);
  });

  it("uses fill layout for clinic thumbnails", () => {
    const { container } = render(<GalleryWithLightbox items={ITEMS} variant="clinic" />);

    expect(container.querySelector('[data-gallery-variant="clinic"]')).toBeTruthy();
    expect(container.querySelector("[data-gallery-trigger] img")).toBeTruthy();
  });

  it("returns null when items array is empty", () => {
    const { container } = render(<GalleryWithLightbox items={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("returns null when no items have a valid image url", () => {
    const noImageItems: Array<{ caption: string; image: MediaDTO | null }> = [
      { caption: "Photo 1", image: null },
      { caption: "Photo 2", image: null },
    ];

    const { container } = render(<GalleryWithLightbox items={noImageItems} />);
    expect(container.firstChild).toBeNull();
  });
});
