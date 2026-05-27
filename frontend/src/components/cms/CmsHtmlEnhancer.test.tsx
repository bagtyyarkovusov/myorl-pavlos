import { StrictMode } from "react";
import { describe, expect, it, vi } from "vitest";
import { act, render, screen } from "@testing-library/react";

import { CmsHtmlEnhancer } from "./CmsHtmlEnhancer";

const YOUTUBE_HTML =
  '<figure class="cms-html__video"><div data-cms-youtube="testid" data-cms-title="Demo"></div></figure>';

function expectNoReactRootErrors(consoleError: ReturnType<typeof vi.spyOn>): void {
  const messages = consoleError.mock.calls.map((call) => String(call[0]));
  expect(messages.some((message) => message.includes("already been passed to createRoot"))).toBe(
    false,
  );
  expect(
    messages.some((message) =>
      message.includes("Attempted to synchronously unmount a root while React was already rendering"),
    ),
  ).toBe(false);
}

async function flushDeferredRootCleanup(): Promise<void> {
  await act(async () => {
    await Promise.resolve();
    await new Promise<void>((resolve) => {
      requestAnimationFrame(() => resolve());
    });
  });
}

describe("CmsHtmlEnhancer", () => {
  it("updates playLabel when the effect re-runs", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { rerender, unmount } = render(
      <CmsHtmlEnhancer html={YOUTUBE_HTML} playLabel="Play video" />,
    );

    expect(screen.getByRole("button", { name: "Play video" })).toBeTruthy();

    rerender(<CmsHtmlEnhancer html={YOUTUBE_HTML} playLabel="Смотреть видео" />);

    expect(screen.getByRole("button", { name: "Смотреть видео" })).toBeTruthy();
    expectNoReactRootErrors(consoleError);

    unmount();
    await flushDeferredRootCleanup();
    consoleError.mockRestore();
  });

  it("mounts under StrictMode without React root errors", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = render(
      <StrictMode>
        <CmsHtmlEnhancer html={YOUTUBE_HTML} playLabel="Play video" />
      </StrictMode>,
    );

    expect(screen.getByRole("button", { name: "Play video" })).toBeTruthy();
    expectNoReactRootErrors(consoleError);

    unmount();
    await flushDeferredRootCleanup();
    consoleError.mockRestore();
  });

  it("unmounts deferred roots after the placeholder leaves the document", async () => {
    const consoleError = vi.spyOn(console, "error").mockImplementation(() => {});

    const { unmount } = render(
      <CmsHtmlEnhancer html={YOUTUBE_HTML} playLabel="Play video" />,
    );

    expect(screen.getByRole("button", { name: "Play video" })).toBeTruthy();

    unmount();
    await flushDeferredRootCleanup();

    expectNoReactRootErrors(consoleError);
    consoleError.mockRestore();
  });
});
