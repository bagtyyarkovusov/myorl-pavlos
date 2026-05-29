import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useOverlayLifecycle } from "./useOverlayLifecycle";

describe("useOverlayLifecycle", () => {
  beforeEach(() => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: false,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );
  });

  afterEach(() => {
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("starts closed when isOpen is false", () => {
    const onClosed = vi.fn();
    const { result } = renderHook(() => useOverlayLifecycle({ isOpen: false, onClosed }));

    expect(result.current.lifecycle).toBe("closed");
    expect(result.current.shouldRender).toBe(false);
    expect(result.current.dataState).toBe("closed");
  });

  it("opens when isOpen becomes true", async () => {
    const onClosed = vi.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }) => useOverlayLifecycle({ isOpen, onClosed }),
      { initialProps: { isOpen: false } },
    );

    rerender({ isOpen: true });

    expect(result.current.lifecycle).toBe("open");
    expect(result.current.shouldRender).toBe(true);
    expect(result.current.dataState).toBe("closed");

    await act(async () => {
      await new Promise((resolve) => requestAnimationFrame(resolve));
    });

    expect(result.current.dataState).toBe("open");
  });

  it("requestClose with reduced motion calls onClosed immediately", () => {
    vi.stubGlobal(
      "matchMedia",
      vi.fn().mockImplementation(() => ({
        matches: true,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    );

    const onClosed = vi.fn();
    const { result } = renderHook(() => useOverlayLifecycle({ isOpen: true, onClosed }));

    act(() => {
      result.current.requestClose();
    });

    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(result.current.lifecycle).toBe("closed");
  });

  it("requestClose enters closing then finishes via timeout", () => {
    vi.useFakeTimers();
    const onClosed = vi.fn();
    const { result } = renderHook(() =>
      useOverlayLifecycle({ isOpen: true, onClosed, closeTimeoutMs: 300 }),
    );

    act(() => {
      result.current.requestClose();
    });

    expect(result.current.lifecycle).toBe("closing");
    expect(result.current.dataState).toBe("closed");
    expect(onClosed).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onClosed).toHaveBeenCalledTimes(1);
    expect(result.current.lifecycle).toBe("closed");
  });

  it("isOpen false triggers closing lifecycle", () => {
    vi.useFakeTimers();
    const onClosed = vi.fn();
    const { result, rerender } = renderHook(
      ({ isOpen }) => useOverlayLifecycle({ isOpen, onClosed }),
      { initialProps: { isOpen: true } },
    );

    rerender({ isOpen: false });

    expect(result.current.lifecycle).toBe("closing");

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(onClosed).toHaveBeenCalledTimes(1);
  });
});
