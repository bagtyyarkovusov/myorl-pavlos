import { describe, expect, it } from "vitest";

import { primaryClinicMapEmbedSrc, primaryClinicMapsUrl } from "./contact-fallbacks";

describe("canonical clinic map links", () => {
  it("uses stable clinic coordinates instead of locale-dependent address geocoding", () => {
    const el = primaryClinicMapEmbedSrc("el");
    const ru = primaryClinicMapEmbedSrc("ru");

    expect(el).toContain("37.9873467%2C23.7580431");
    expect(ru).toContain("37.9873467%2C23.7580431");
    expect(el).toContain("hl=el");
    expect(ru).toContain("hl=ru");
  });

  it("builds the secondary Google Maps destination from the same coordinates", () => {
    expect(primaryClinicMapsUrl()).toBe(
      "https://www.google.com/maps/search/?api=1&query=37.9873467%2C23.7580431",
    );
  });
});
