import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { DensityProvider, useDensity } from "./density-context";

function DensityProbe() {
  const density = useDensity();
  return <span>{density}</span>;
}

describe("DensityProvider", () => {
  it("provides density derived from page type and layout variant", () => {
    render(
      <DensityProvider pageType="home" layoutVariant="standard">
        <DensityProbe />
      </DensityProvider>,
    );

    expect(screen.getByText("theater")).toBeDefined();
  });

  it("falls back to focused density outside a provider", () => {
    render(<DensityProbe />);

    expect(screen.getByText("focused")).toBeDefined();
  });
});
