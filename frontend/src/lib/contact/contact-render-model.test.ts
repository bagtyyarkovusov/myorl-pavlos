import { describe, expect, it } from "vitest";
import type { SectionDTO } from "@/lib/cms/types";

import { buildContactRenderModel, formatTelHref } from "./contact-render-model";

function makeContactSection(
  clinics: Extract<SectionDTO, { __component: "sections.contact" }>["clinics"],
): Extract<SectionDTO, { __component: "sections.contact" }> {
  return {
    __component: "sections.contact",
    heading: "Contact",
    intro: null,
    details: [],
    clinics,
  };
}

describe("buildContactRenderModel", () => {
  it("selects deterministic primary phone and email actions", () => {
    const model = buildContactRenderModel(
      makeContactSection([
        {
          name: "No phone",
          addressHtml: "<p>Address A</p>",
          phone: null,
          email: "first@example.com",
        },
        {
          name: "Phone clinic",
          addressHtml: "<p>Address B</p>",
          phone: "+30 (210) 123 4567",
          email: "second@example.com",
        },
      ]),
    );

    expect(model.primaryPhoneAction).toEqual({
      label: "+30 (210) 123 4567",
      href: "tel:+302101234567",
    });
    expect(model.primaryEmailAction).toEqual({
      label: "first@example.com",
      href: "mailto:first@example.com",
    });
  });

  it("uses coordinates before address fallback for map queries", () => {
    const model = buildContactRenderModel(
      makeContactSection([
        {
          name: "Address clinic",
          addressHtml: "<p>Address A</p>",
          phone: null,
          email: null,
        },
        {
          name: "Coordinate clinic",
          addressHtml: "<p>Address B</p>",
          phone: null,
          email: null,
          latitude: 37.9838,
          longitude: 23.7275,
        },
      ]),
    );

    expect(model.map).toMatchObject({
      query: "37.9838,23.7275",
      center: "37.9838,23.7275",
      source: "coordinates",
    });
    expect(model.map?.src).toContain("37.9838%2C23.7275");
    expect(model.initialActiveClinicName).toBe("Coordinate clinic");
  });

  it("falls back to a stripped clinic address when coordinates are absent", () => {
    const model = buildContactRenderModel(
      makeContactSection([
        {
          name: "Address clinic",
          addressHtml: "<p>123 Main St<br>Athens</p>",
          phone: null,
          email: null,
        },
      ]),
    );

    expect(model.map).toMatchObject({
      query: "123 Main St Athens",
      source: "address",
    });
    expect(model.map?.src).toContain("123%20Main%20St%20Athens");
  });

  it("omits the map when no usable query exists", () => {
    const model = buildContactRenderModel(
      makeContactSection([
        {
          name: "Incomplete clinic",
          addressHtml: "",
          phone: null,
          email: null,
        },
      ]),
    );

    expect(model.map).toBeNull();
  });
});

describe("formatTelHref", () => {
  it("keeps digits and plus sign only", () => {
    expect(formatTelHref("+30 (210) 123 4567")).toBe("+302101234567");
  });
});
