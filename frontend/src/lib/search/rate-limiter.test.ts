import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { checkRateLimit, clearRateLimitBuckets } from "./rate-limiter";

describe("checkRateLimit", () => {
  beforeEach(() => {
    clearRateLimitBuckets();
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it("allows up to the limit", () => {
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("192.168.1.1")).toBe(true);
    }
  });

  it("rejects requests over the limit", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("192.168.1.1");
    }

    expect(checkRateLimit("192.168.1.1")).toBe(false);
  });

  it("allows requests again after the window passes", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("192.168.1.1");
    }

    expect(checkRateLimit("192.168.1.1")).toBe(false);

    // Advance past the 60s window
    vi.advanceTimersByTime(61_000);

    expect(checkRateLimit("192.168.1.1")).toBe(true);
  });

  it("tracks different IPs independently", () => {
    for (let i = 0; i < 10; i++) {
      checkRateLimit("192.168.1.1");
    }

    // First IP is rate limited
    expect(checkRateLimit("192.168.1.1")).toBe(false);

    // Different IP still has full quota
    for (let i = 0; i < 10; i++) {
      expect(checkRateLimit("10.0.0.1")).toBe(true);
    }

    expect(checkRateLimit("10.0.0.1")).toBe(false);
  });

  it("respects custom limit and window", () => {
    for (let i = 0; i < 3; i++) {
      expect(checkRateLimit("192.168.1.1", 3, 10_000)).toBe(true);
    }

    expect(checkRateLimit("192.168.1.1", 3, 10_000)).toBe(false);

    vi.advanceTimersByTime(11_000);

    expect(checkRateLimit("192.168.1.1", 3, 10_000)).toBe(true);
  });

  it("drops expired timestamps from the bucket", () => {
    // Make 5 requests at t=0
    for (let i = 0; i < 5; i++) {
      checkRateLimit("192.168.1.1");
    }

    // Advance 30s, make 5 more (now 10 total within the window)
    vi.advanceTimersByTime(30_000);
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("192.168.1.1")).toBe(true);
    }

    // At 30s, the first 5 haven't expired yet, so 10 total = limit reached
    expect(checkRateLimit("192.168.1.1")).toBe(false);

    // Advance past 60s from start, first 5 expire, 5 remaining + room for 5 more
    vi.advanceTimersByTime(31_000);
    for (let i = 0; i < 5; i++) {
      expect(checkRateLimit("192.168.1.1")).toBe(true);
    }

    expect(checkRateLimit("192.168.1.1")).toBe(false);
  });
});
