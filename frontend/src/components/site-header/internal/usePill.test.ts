import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { usePill } from "./usePill";

describe("usePill", () => {
  it("starts with hidden pill", () => {
    const { result } = renderHook(() => usePill());
    expect(result.current.pillStyle).toEqual({
      width: 0,
      left: 0,
      opacity: 0,
    });
  });

  it("sync updates pill position from registered rect", () => {
    const { result } = renderHook(() => usePill());

    act(() => {
      result.current.registerRect("menu-1", { width: 120, left: 200 });
      result.current.sync("menu-1");
    });

    expect(result.current.pillStyle).toEqual({
      width: 120,
      left: 200,
      opacity: 1,
    });
  });

  it("sync hides pill when activeId is null", () => {
    const { result } = renderHook(() => usePill());

    act(() => {
      result.current.registerRect("menu-1", { width: 120, left: 200 });
      result.current.sync("menu-1");
    });
    expect(result.current.pillStyle.opacity).toBe(1);

    act(() => {
      result.current.sync(null);
    });
    expect(result.current.pillStyle.opacity).toBe(0);
  });

  it("sync hides pill when activeId has no registered rect", () => {
    const { result } = renderHook(() => usePill());

    act(() => {
      result.current.sync("unknown-id");
    });

    expect(result.current.pillStyle.opacity).toBe(0);
  });

  it("multiple items can register rects independently", () => {
    const { result } = renderHook(() => usePill());

    act(() => {
      result.current.registerRect("menu-1", { width: 100, left: 0 });
      result.current.registerRect("menu-2", { width: 150, left: 120 });
      result.current.registerRect("menu-3", { width: 80, left: 290 });
    });

    act(() => result.current.sync("menu-2"));
    expect(result.current.pillStyle).toEqual({
      width: 150,
      left: 120,
      opacity: 1,
    });
  });

  it("updating a registered rect changes pill on next sync", () => {
    const { result } = renderHook(() => usePill());

    act(() => {
      result.current.registerRect("menu-1", { width: 100, left: 0 });
      result.current.sync("menu-1");
    });
    expect(result.current.pillStyle.width).toBe(100);

    act(() => {
      result.current.registerRect("menu-1", { width: 200, left: 50 });
      result.current.sync("menu-1");
    });
    expect(result.current.pillStyle).toEqual({
      width: 200,
      left: 50,
      opacity: 1,
    });
  });

  it("sync with activeId null preserves width/left but hides opacity", () => {
    const { result } = renderHook(() => usePill());

    act(() => {
      result.current.registerRect("menu-1", { width: 120, left: 200 });
      result.current.sync("menu-1");
    });

    const prev = result.current.pillStyle;
    act(() => result.current.sync(null));
    expect(result.current.pillStyle).toEqual({
      width: prev.width,
      left: prev.left,
      opacity: 0,
    });
  });
});
