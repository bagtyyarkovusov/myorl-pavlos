import type { VideoItemDTO } from "@/lib/cms/types/sections";

export type VideoObjectLd = {
  "@type": "VideoObject";
  name: string;
  contentUrl: string;
  thumbnailUrl?: string;
};

export function buildVideoObjectLd(videos: VideoItemDTO[]): VideoObjectLd[] | null {
  const results: VideoObjectLd[] = [];

  for (const video of videos) {
    const contentUrl = video.videoMp4?.url ?? video.videoWebm?.url;
    if (!contentUrl) continue;

    const entry: VideoObjectLd = {
      "@type": "VideoObject",
      name: video.title ?? "Video",
      contentUrl,
    };

    if (video.thumbnail?.url) {
      entry.thumbnailUrl = video.thumbnail.url;
    }

    results.push(entry);
  }

  return results.length > 0 ? results : null;
}
