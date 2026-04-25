import { describe, expect, it } from "vitest";
import { sanitizeCmsHtml } from "./html";

describe("sanitizeCmsHtml", () => {
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
});
