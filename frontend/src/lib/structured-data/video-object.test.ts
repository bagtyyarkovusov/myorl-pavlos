import { describe, expect, it } from "vitest";
import { buildVideoObjectLd } from "./video-object";
import type { VideoItemDTO } from "@/lib/cms/types/sections";

function makeVideo(overrides: Partial<VideoItemDTO> = {}): VideoItemDTO {
  return {
    title: overrides.title ?? "Test Video",
    videoMp4: overrides.videoMp4 ?? null,
    videoWebm: overrides.videoWebm ?? null,
    thumbnail: overrides.thumbnail ?? null,
  };
}

describe("buildVideoObjectLd", () => {
  it("returns null when no videos have URLs", () => {
    const videos = [makeVideo()];
    expect(buildVideoObjectLd(videos)).toBeNull();
  });

  it("builds VideoObject from mp4 URL", () => {
    const videos = [
      makeVideo({ videoMp4: { url: "https://example.com/video.mp4", alternativeText: null } }),
    ];
    const result = buildVideoObjectLd(videos);
    expect(result).toHaveLength(1);
    expect(result![0]).toMatchObject({
      "@type": "VideoObject",
      name: "Test Video",
      contentUrl: "https://example.com/video.mp4",
    });
  });

  it("builds VideoObject from webm URL when mp4 is absent", () => {
    const videos = [
      makeVideo({ videoWebm: { url: "https://example.com/video.webm", alternativeText: null } }),
    ];
    const result = buildVideoObjectLd(videos);
    expect(result).toHaveLength(1);
    expect(result![0]!.contentUrl).toBe("https://example.com/video.webm");
  });

  it("includes thumbnailUrl when thumbnail is present", () => {
    const videos = [
      makeVideo({
        videoMp4: { url: "https://example.com/video.mp4", alternativeText: null },
        thumbnail: { url: "https://example.com/thumb.jpg", alternativeText: null },
      }),
    ];
    const result = buildVideoObjectLd(videos);
    expect(result![0]!.thumbnailUrl).toBe("https://example.com/thumb.jpg");
  });

  it("skips videos without a content URL", () => {
    const videos = [
      makeVideo(),
      makeVideo({ videoMp4: { url: "https://example.com/valid.mp4", alternativeText: null } }),
    ];
    const result = buildVideoObjectLd(videos);
    expect(result).toHaveLength(1);
  });
});
