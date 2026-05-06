import { describe, expect, it } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { useRef } from "react";

import { useFocusTrap } from "./useFocusTrap";

function TestComponent({ enabled }: { enabled: boolean }) {
  const containerRef = useRef<HTMLDivElement>(null);
  useFocusTrap(containerRef, enabled);

  return (
    <div>
      <button type="button">Outside</button>
      <div ref={containerRef} data-testid="trap">
        <button type="button">First</button>
        <button type="button">Middle</button>
        <button type="button">Last</button>
      </div>
    </div>
  );
}

describe("useFocusTrap", () => {
  it("cycles Tab forward from last to first element", () => {
    render(<TestComponent enabled={true} />);

    const last = screen.getByRole("button", { name: "Last" });
    last.focus();

    fireEvent.keyDown(last, { key: "Tab" });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "First" }));
  });

  it("cycles Shift+Tab backward from first to last element", () => {
    render(<TestComponent enabled={true} />);

    const first = screen.getByRole("button", { name: "First" });
    first.focus();

    fireEvent.keyDown(first, { key: "Tab", shiftKey: true });

    expect(document.activeElement).toBe(screen.getByRole("button", { name: "Last" }));
  });

  it("does not intercept non-Tab keys", () => {
    render(<TestComponent enabled={true} />);

    const first = screen.getByRole("button", { name: "First" });
    first.focus();

    fireEvent.keyDown(first, { key: "Enter" });

    expect(document.activeElement).toBe(first);
  });

  it("restores focus to the previously focused element on disable", () => {
    const outside = document.createElement("button");
    outside.textContent = "Outside";
    document.body.appendChild(outside);
    outside.focus();

    const { rerender } = render(<TestComponent enabled={true} />);
    rerender(<TestComponent enabled={false} />);

    expect(document.activeElement).toBe(outside);
    document.body.removeChild(outside);
  });
});
