import { describe, expect, it, vi } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useDrawer } from "./useDrawer";

describe("useDrawer", () => {
  it("starts closed", () => {
    const { result } = renderHook(() => useDrawer());
    expect(result.current.isOpen).toBe(false);
  });

  it("toggles open and close", () => {
    const { result } = renderHook(() => useDrawer());

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.close());
    expect(result.current.isOpen).toBe(false);
  });

  it("locks body scroll when open", () => {
    const { result } = renderHook(() => useDrawer());

    act(() => result.current.open());
    expect(document.body.style.overflow).toBe("hidden");
  });

  it("restores body scroll on close", () => {
    const original = document.body.style.overflow;
    const { result } = renderHook(() => useDrawer());

    act(() => result.current.open());
    act(() => result.current.close());
    expect(document.body.style.overflow).toBe(original);
  });

  it("closes on Escape keydown and returns focus to open button", () => {
    const openBtn = { focus: vi.fn() } as unknown as HTMLButtonElement;
    const { result } = renderHook(() => useDrawer());

    result.current.openButtonRef.current = openBtn;

    act(() => result.current.open());
    expect(result.current.isOpen).toBe(true);

    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    });

    expect(result.current.isOpen).toBe(false);
    expect(openBtn.focus).toHaveBeenCalled();
  });

  it("does not close on non-Escape keys", () => {
    const { result } = renderHook(() => useDrawer());

    act(() => result.current.open());
    act(() => {
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter" }));
    });

    expect(result.current.isOpen).toBe(true);
  });

  it("focuses close button when drawer opens", () => {
    const closeBtn = { focus: vi.fn() } as unknown as HTMLButtonElement;
    const { result } = renderHook(() => useDrawer());

    result.current.closeButtonRef.current = closeBtn;

    act(() => result.current.open());
    expect(closeBtn.focus).toHaveBeenCalled();
  });

  it("removes keydown listener on unmount while open", () => {
    const removeSpy = vi.spyOn(document, "removeEventListener");
    const { result, unmount } = renderHook(() => useDrawer());

    act(() => result.current.open());
    unmount();

    expect(removeSpy).toHaveBeenCalledWith("keydown", expect.any(Function));
    removeSpy.mockRestore();
  });
});
