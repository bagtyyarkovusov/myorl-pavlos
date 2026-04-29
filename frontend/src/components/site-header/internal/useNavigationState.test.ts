import { describe, expect, it } from "vitest";
import { act, renderHook } from "@testing-library/react";

import { useNavigationState } from "./useNavigationState";

describe("useNavigationState", () => {
  it("starts with no open menu and no hover", () => {
    const { result } = renderHook(() => useNavigationState());
    expect(result.current.openMenuId).toBeNull();
    expect(result.current.hoveredId).toBeNull();
    expect(result.current.activeId).toBeNull();
  });

  it("sets hoveredId on hover", () => {
    const { result } = renderHook(() => useNavigationState());

    act(() => result.current.setHoveredId("menu-1"));
    expect(result.current.hoveredId).toBe("menu-1");
    expect(result.current.activeId).toBe("menu-1");
  });

  it("click-to-open sets openMenuId", () => {
    const { result } = renderHook(() => useNavigationState());

    act(() => result.current.clickToToggle("menu-1"));
    expect(result.current.openMenuId).toBe("menu-1");
  });

  it("click-to-close toggles openMenuId off", () => {
    const { result } = renderHook(() => useNavigationState());

    act(() => result.current.clickToToggle("menu-1"));
    act(() => result.current.clickToToggle("menu-1"));
    expect(result.current.openMenuId).toBeNull();
  });

  it("activeId equals hoveredId when hovering", () => {
    const { result } = renderHook(() => useNavigationState());

    act(() => result.current.setHoveredId("menu-1"));
    expect(result.current.activeId).toBe("menu-1");
  });

  it("activeId equals openMenuId when menu is open and no hover", () => {
    const { result } = renderHook(() => useNavigationState());

    act(() => result.current.clickToToggle("menu-2"));
    expect(result.current.activeId).toBe("menu-2");
  });

  it("activeId prefers hoveredId over openMenuId", () => {
    const { result } = renderHook(() => useNavigationState());

    act(() => result.current.clickToToggle("menu-1"));
    act(() => result.current.setHoveredId("menu-2"));
    expect(result.current.activeId).toBe("menu-2");
  });

  it("resets hoveredId on mouseLeave while menu stays open", () => {
    const { result } = renderHook(() => useNavigationState());

    act(() => result.current.clickToToggle("menu-1"));
    act(() => result.current.setHoveredId("menu-2"));
    act(() => result.current.setHoveredId(null));
    expect(result.current.hoveredId).toBeNull();
    expect(result.current.activeId).toBe("menu-1");
  });

  it("switching to a different menu closes previous and opens new", () => {
    const { result } = renderHook(() => useNavigationState());

    act(() => result.current.clickToToggle("menu-1"));
    expect(result.current.openMenuId).toBe("menu-1");

    act(() => result.current.clickToToggle("menu-2"));
    expect(result.current.openMenuId).toBe("menu-2");
  });

  it("openMenu sets openMenuId regardless of current state", () => {
    const { result } = renderHook(() => useNavigationState());

    act(() => result.current.openMenu("menu-1"));
    expect(result.current.openMenuId).toBe("menu-1");

    act(() => result.current.openMenu("menu-2"));
    expect(result.current.openMenuId).toBe("menu-2");
  });

  it("closeMenus clears openMenuId", () => {
    const { result } = renderHook(() => useNavigationState());

    act(() => result.current.openMenu("menu-1"));
    act(() => result.current.closeMenus());
    expect(result.current.openMenuId).toBeNull();
  });
});
