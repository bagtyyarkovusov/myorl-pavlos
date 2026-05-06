import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";

import { HomeMedicalGrid } from "./HomeMedicalGrid";
import type { LinkedResourceItemDTO } from "@/lib/cms/types";

const items: LinkedResourceItemDTO[] = [
  {
    title: "Tonsillectomy",
    description: "Surgical removal of the tonsils.",
    targetUrl: null,
    targetPage: null,
    image: {
      url: "/img/tonsillectomy.jpg",
      alternativeText: "Tonsillectomy procedure illustration",
      width: 400,
      height: 300,
    },
  },
  {
    title: "Rhinoplasty",
    description: "Nose reshaping surgery.",
    targetUrl: null,
    targetPage: null,
    image: {
      url: "/img/rhinoplasty.jpg",
      alternativeText: null,
      width: 400,
      height: 300,
    },
  },
];

describe("HomeMedicalGrid", () => {
  it("uses CMS alternativeText when available", () => {
    render(
      <HomeMedicalGrid
        title="Services"
        intro="Our services"
        items={items}
        locale="el"
        learnMoreLabel="Learn more"
        viewAllLabel="View all"
      />,
    );

    const { container } = render(
      <HomeMedicalGrid
        title="Services"
        intro="Our services"
        items={items}
        locale="el"
        learnMoreLabel="Learn more"
        viewAllLabel="View all"
      />,
    );
    const images = container.querySelectorAll("img");
    const tonsilImg = Array.from(images).find((img) =>
      img.getAttribute("alt")?.includes("Tonsillectomy"),
    );
    expect(tonsilImg).toBeDefined();
    expect(tonsilImg?.getAttribute("alt")).toBe("Tonsillectomy procedure illustration");
  });

  it("falls back to item title when alternativeText is missing", () => {
    render(
      <HomeMedicalGrid
        title="Services"
        intro="Our services"
        items={items}
        locale="el"
        learnMoreLabel="Learn more"
        viewAllLabel="View all"
      />,
    );

    const { container } = render(
      <HomeMedicalGrid
        title="Services"
        intro="Our services"
        items={items}
        locale="el"
        learnMoreLabel="Learn more"
        viewAllLabel="View all"
      />,
    );
    const images = container.querySelectorAll("img");
    const rhinoImg = Array.from(images).find((img) =>
      img.getAttribute("alt")?.includes("Rhinoplasty"),
    );
    expect(rhinoImg).toBeDefined();
    expect(rhinoImg?.getAttribute("alt")).toBe("Rhinoplasty");
  });
});
