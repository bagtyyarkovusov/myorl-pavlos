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
    const { container } = render(
      <HomeMedicalGrid
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
    const { container } = render(
      <HomeMedicalGrid
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

  it("suppresses the section header to sit flush against adjacent sections", () => {
    render(
      <HomeMedicalGrid
        items={items}
        locale="el"
        learnMoreLabel="Learn more"
        viewAllLabel="View all"
      />,
    );
    expect(
      screen.queryByRole("heading", { level: 2, name: "Medical Services" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Our comprehensive medical services")).not.toBeInTheDocument();
  });

  it("still renders title-only header metadata inside cards", () => {
    render(
      <HomeMedicalGrid
        items={items}
        locale="el"
        learnMoreLabel="Learn more"
        viewAllLabel="View all"
      />,
    );
    expect(screen.getByRole("heading", { level: 3, name: "Tonsillectomy" })).toBeInTheDocument();
  });

  it("returns null when items array is empty", () => {
    const { container } = render(
      <HomeMedicalGrid
        items={[]}
        locale="el"
        learnMoreLabel="Learn more"
        viewAllLabel="View all"
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders the view-all link when there are more than 6 items", () => {
    const manyItems = Array.from({ length: 7 }, (_, i) => ({
      title: `Service ${i + 1}`,
      description: "Description",
      targetUrl: null,
      targetPage: null,
      image: null,
    }));

    render(
      <HomeMedicalGrid
        items={manyItems}
        locale="el"
        learnMoreLabel="Learn more"
        viewAllLabel="View all services"
      />,
    );
    expect(screen.getByRole("link", { name: /view all services/i })).toBeInTheDocument();
  });

  it("renders at most 6 items and shows the view-all link when more are passed", () => {
    const manyItems = Array.from({ length: 8 }, (_, i) => ({
      title: `Service ${i + 1}`,
      description: "Description",
      targetUrl: null,
      targetPage: null,
      image: null,
    }));

    render(
      <HomeMedicalGrid
        items={manyItems}
        locale="el"
        learnMoreLabel="Learn more"
        viewAllLabel="View all services"
      />,
    );
    const listItems = screen.getAllByRole("listitem");
    expect(listItems).toHaveLength(6);
    expect(screen.getByRole("link", { name: /view all services/i })).toBeInTheDocument();
  });

  it("does not render the view-all link when there are 6 or fewer items", () => {
    render(
      <HomeMedicalGrid
        items={items}
        locale="el"
        learnMoreLabel="Learn more"
        viewAllLabel="View all services"
      />,
    );
    expect(screen.queryByRole("link", { name: /view all services/i })).not.toBeInTheDocument();
  });
});
