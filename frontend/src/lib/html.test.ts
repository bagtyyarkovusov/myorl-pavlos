import { afterEach, describe, expect, it, vi } from "vitest";
import { sanitizeCmsHtml, stripTags } from "./html";

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

  it("keeps iframes from allowlisted hosts (youtube)", () => {
    const input = '<iframe src="https://www.youtube.com/embed/abc"></iframe>';
    const result = sanitizeCmsHtml(input);
    expect(result).toContain("iframe");
    expect(result).toContain("youtube.com");
  });

  it("strips inline style attributes", () => {
    const input = '<p style="color:red">hi</p>';
    expect(sanitizeCmsHtml(input)).toBe("<p>hi</p>");
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
