import { describe, expect, it } from "vitest";
import { buildImageObjectLd } from "./image-object";
import type { GalleryItemDTO } from "@/lib/cms/types/sections";

function makeItem(overrides: Partial<GalleryItemDTO> = {}): GalleryItemDTO {
  return {
    caption: overrides.caption ?? null,
    image: overrides.image ?? null,
  };
}

describe("buildImageObjectLd", () => {
  it("returns null when no items have images", () => {
    const items = [makeItem()];
    expect(buildImageObjectLd(items)).toBeNull();
  });

  it("builds ImageObject from image URL", () => {
    const items = [
      makeItem({ image: { url: "https://example.com/photo.jpg", alternativeText: null } }),
    ];
    const result = buildImageObjectLd(items);
    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({
      "@type": "ImageObject",
      contentUrl: "https://example.com/photo.jpg",
    });
  });

  it("includes caption when present", () => {
    const items = [
      makeItem({
        caption: "A nice photo",
        image: { url: "https://example.com/photo.jpg", alternativeText: null },
      }),
    ];
    const result = buildImageObjectLd(items);
    expect(result![0]!.caption).toBe("A nice photo");
  });

  it("includes width and height when present", () => {
    const items = [
      makeItem({
        image: {
          url: "https://example.com/photo.jpg",
          alternativeText: null,
          width: 800,
          height: 600,
        },
      }),
    ];
    const result = buildImageObjectLd(items);
    expect(result![0]!.width).toBe(800);
    expect(result![0]!.height).toBe(600);
  });

  it("skips items without an image URL", () => {
    const items = [
      makeItem(),
      makeItem({ image: { url: "https://example.com/valid.jpg", alternativeText: null } }),
    ];
    const result = buildImageObjectLd(items);
    expect(result).toHaveLength(1);
  });
});
