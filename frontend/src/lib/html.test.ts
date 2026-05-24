import { afterEach, describe, expect, it, vi } from "vitest";
import {
  extractYoutubeVideoId,
  groupConsecutiveFigures,
  normalizeLegacyCmsMarkup,
  preserveLegacyAlignment,
  removeBrokenImages,
  replaceYoutubeIframes,
  sanitizeCmsHtml,
  stripTags,
  unwrapLegacyWrapperDivs,
  upgradeImageOnlyParagraphs,
} from "./html";

describe("sanitizeCmsHtml", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("strips <script> tags", () => {
    const input = '<p>safe</p><script>alert("xss")</script>';
    expect(sanitizeCmsHtml(input)).toBe("<p>safe</p>");
  });

  it("strips event-handler attributes", () => {
    const input = '<a href="https://example.com" onclick="steal()">link</a>';
    const result = sanitizeCmsHtml(input);
    expect(result).not.toContain("onclick");
    expect(result).toContain("href");
  });

  it("removes iframes from non-allowlisted hosts", () => {
    const input = '<iframe src="https://evil.example.com/embed"></iframe>';
    expect(sanitizeCmsHtml(input)).toBe("");
  });

  it("converts youtube iframes to hydration placeholders", () => {
    const input = '<iframe src="https://www.youtube.com/embed/abc"></iframe>';
    const result = sanitizeCmsHtml(input);
    expect(result).not.toContain("<iframe");
    expect(result).toContain('data-cms-youtube="abc"');
    expect(result).toContain("cms-html__video");
  });

  it("strips inline style attributes", () => {
    const input = '<p style="color:red">hi</p>';
    expect(sanitizeCmsHtml(input)).toBe("<p>hi</p>");
  });

  it("preserves legacy centered alignment as a safe layout class", () => {
    const input =
      '<p align="center"><iframe src="https://www.youtube.com/embed/abc"></iframe></p>' +
      '<h5 style="text-align: center;"><strong>Title</strong></h5>';
    const result = sanitizeCmsHtml(input);
    expect(result).toContain('class="cms-html__align-center"');
    expect(result).toContain('data-cms-youtube="abc"');
    expect(result).not.toContain("align=");
    expect(result).not.toContain("style=");
  });

  it("unwraps legacy tab-content wrappers so cms-html spacing applies", () => {
    const input = '<div class="tab-content"><p>One</p><p>Two</p></div>';
    expect(sanitizeCmsHtml(input)).toBe("<p>One</p><p>Two</p>");
  });

  it("normalizes protocol-relative youtube embeds to video placeholders", () => {
    const input = '<iframe src="//www.youtube.com/embed/abc"></iframe>';
    const result = sanitizeCmsHtml(input);
    expect(result).toContain('data-cms-youtube="abc"');
  });

  it("returns empty string for null/undefined", () => {
    expect(sanitizeCmsHtml(null)).toBe("");
    expect(sanitizeCmsHtml(undefined)).toBe("");
  });

  it("does not require the browser Element global", () => {
    vi.stubGlobal("Element", undefined);

    expect(sanitizeCmsHtml('<a href="https://example.com" target="_blank">link</a>')).toContain(
      'rel="noopener noreferrer"',
    );
  });

  it("promotes image-only paragraphs to figure for structure and layout hooks", () => {
    const input = '<p><img src="/uploads/a.jpg" alt="diagram"></p><p>Body</p>';
    const result = sanitizeCmsHtml(input);
    expect(result).toContain('<figure class="cms-html__figure">');
    expect(result).toContain("<img");
    expect(result).toContain("Body");
    expect(result).not.toMatch(/<p>\s*<img/);
  });

  it("keeps centered image-only paragraphs aligned after figure promotion", () => {
    const input = '<p style="text-align:center"><img src="/uploads/a.jpg" alt="diagram"></p>';
    const result = sanitizeCmsHtml(input);
    expect(result).toContain('class="cms-html__figure cms-html__align-center"');
  });

  it("leaves paragraphs that mix text and images unchanged", () => {
    const input = '<p>See <img src="/b.jpg" alt=""> for detail.</p>';
    expect(sanitizeCmsHtml(input)).not.toContain("cms-html__figure");
  });

  it("removes Word paste artifacts that lose their src during sanitization", () => {
    const input =
      '<p>Intro</p><p><img alt="" height="15" src="file:///C:/Temp/msohtmlclip1/01/clip.gif" title="Нажмите и перетащите" width="15"></p>' +
      '<p><img alt="" src="/uploads/img2.jpg" width="800"></p>';
    const result = sanitizeCmsHtml(input);
    expect(result).not.toContain("перетащите");
    expect(result).not.toContain('height="15"');
    expect(result).toContain("/uploads/img2.jpg");
    expect(result).toContain('<figure class="cms-html__figure">');
  });

  it("replaces youtube iframes with hydration placeholders", () => {
    const input =
      '<h4>Procedure video</h4><iframe src="https://www.youtube.com/embed/abc123" title="Clip"></iframe>';
    const result = sanitizeCmsHtml(input);
    expect(result).not.toContain("<iframe");
    expect(result).toContain('data-cms-youtube="abc123"');
    expect(result).toContain('data-cms-title="Procedure video"');
    expect(result).toContain("cms-html__video");
  });

  it("keeps vimeo iframes as native embeds", () => {
    const input = '<iframe src="https://player.vimeo.com/video/12345"></iframe>';
    const result = sanitizeCmsHtml(input);
    expect(result).toContain("<iframe");
    expect(result).toContain("vimeo.com");
    expect(result).not.toContain("data-cms-youtube");
  });

  it("wraps consecutive image figures in a two-up row", () => {
    const input =
      '<figure class="cms-html__figure"><img src="/1.jpg" alt=""></figure>' +
      '<figure class="cms-html__figure"><img src="/2.jpg" alt=""></figure>' +
      "<p>Between</p>" +
      '<figure class="cms-html__figure"><img src="/3.jpg" alt=""></figure>';
    const result = sanitizeCmsHtml(input);
    expect(result).toContain('class="cms-html__figure-row"');
    expect(result.match(/cms-html__figure-row/g)?.length).toBe(1);
    expect(result).toContain("Between");
  });

  it("wraps three or more consecutive figures in a media stack", () => {
    const input =
      '<figure class="cms-html__figure"><img src="/1.jpg" alt=""></figure>' +
      '<figure class="cms-html__figure"><img src="/2.jpg" alt=""></figure>' +
      '<figure class="cms-html__figure"><img src="/3.jpg" alt=""></figure>';
    const result = groupConsecutiveFigures(input);
    expect(result).toContain('class="cms-html__media-stack"');
    expect(result).toContain('class="cms-html__figure-row"');
    expect(result).not.toMatch(/cms-html__media-stack[\s\S]*cms-html__media-stack/);
  });

  it("does not pair figures separated by paragraphs", () => {
    const input =
      '<figure class="cms-html__figure"><img src="/1.jpg" alt=""></figure>' +
      "<p>Caption</p>" +
      '<figure class="cms-html__figure"><img src="/2.jpg" alt=""></figure>';
    const result = groupConsecutiveFigures(input);
    expect(result).not.toContain("cms-html__figure-row");
  });

  it("preserves centered youtube wrappers as centered figures", () => {
    const input =
      '<p align="center"><iframe src="https://www.youtube.com/embed/xyz99"></iframe></p>';
    const result = sanitizeCmsHtml(input);
    expect(result).toContain("cms-html__align-center");
    expect(result).toContain('data-cms-youtube="xyz99"');
  });
});

describe("extractYoutubeVideoId", () => {
  it("reads embed URLs", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/embed/abc123")).toBe("abc123");
    expect(extractYoutubeVideoId("//www.youtube-nocookie.com/embed/xyz")).toBe("xyz");
  });

  it("reads watch URLs", () => {
    expect(extractYoutubeVideoId("https://www.youtube.com/watch?v=abc123")).toBe("abc123");
  });

  it("returns null for non-youtube hosts", () => {
    expect(extractYoutubeVideoId("https://player.vimeo.com/video/123")).toBeNull();
  });
});

describe("replaceYoutubeIframes", () => {
  it("uses iframe title when no heading precedes the embed", () => {
    const input = '<iframe src="https://www.youtube.com/embed/id1" title="Surgery clip"></iframe>';
    const result = replaceYoutubeIframes(input);
    expect(result).toContain('data-cms-title="Surgery clip"');
  });
});

describe("normalizeLegacyCmsMarkup", () => {
  it("unwraps tab-content and preserves centered headings", () => {
    const input =
      '<div class="tab-content"><p style="text-align:center">Intro</p><h5 align="center">Title</h5></div>';
    const result = normalizeLegacyCmsMarkup(input);
    expect(result).not.toContain("tab-content");
    expect(result).toContain('class="cms-html__align-center"');
  });
});

describe("unwrapLegacyWrapperDivs", () => {
  it("only unwraps a single outer tab-content container", () => {
    expect(unwrapLegacyWrapperDivs('<div class="tab-content"><p>A</p></div>')).toBe("<p>A</p>");
    expect(
      unwrapLegacyWrapperDivs('<div><p>A</p><div class="tab-content">B</div></div>'),
    ).toContain("tab-content");
  });
});

describe("preserveLegacyAlignment", () => {
  it("maps align=center to cms-html__align-center", () => {
    expect(preserveLegacyAlignment('<p align="center">Video</p>')).toBe(
      '<p class="cms-html__align-center">Video</p>',
    );
  });
});

describe("removeBrokenImages", () => {
  it("drops img tags without a usable src", () => {
    const input = '<p><img alt="" height="15" title="placeholder" width="15"></p><p>Body</p>';
    expect(removeBrokenImages(input)).toBe("<p>Body</p>");
  });
});

describe("upgradeImageOnlyParagraphs", () => {
  it("wraps multiple sibling images in one figure", () => {
    const html = '<p>  <img src="/1.jpg" alt=""> <img src="/2.jpg" alt="">  </p>';
    expect(upgradeImageOnlyParagraphs(html).match(/cms-html__figure/g)?.length).toBe(1);
  });
});

describe("stripTags", () => {
  it("removes HTML tags and collapses whitespace", () => {
    expect(stripTags("<p>Hello</p> <br> world")).toBe("Hello world");
  });

  it("handles nested tags", () => {
    expect(stripTags('<div><a href="#">Link</a> <strong>text</strong></div>')).toBe("Link text");
  });

  it("returns empty string for empty input", () => {
    expect(stripTags("")).toBe("");
  });

  it("returns empty string for null/undefined", () => {
    expect(stripTags(null as unknown as string)).toBe("");
    expect(stripTags(undefined as unknown as string)).toBe("");
  });
});
