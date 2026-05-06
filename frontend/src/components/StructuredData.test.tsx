import { describe, expect, it } from "vitest";
import { render } from "@testing-library/react";

import { StructuredData } from "./StructuredData";

describe("StructuredData", () => {
  it("renders a script tag with application/ld+json type", () => {
    const { container } = render(<StructuredData data={{ "@type": "Thing" }} />);
    const script = container.querySelector("script[type='application/ld+json']");
    expect(script).not.toBeNull();
  });

  it("serializes the data object as JSON", () => {
    const data = { "@context": "https://schema.org", "@type": "MedicalBusiness", name: "MyORL" };
    const { container } = render(<StructuredData data={data} />);
    const script = container.querySelector("script[type='application/ld+json']");
    expect(script?.textContent).toBe(JSON.stringify(data));
  });
});
