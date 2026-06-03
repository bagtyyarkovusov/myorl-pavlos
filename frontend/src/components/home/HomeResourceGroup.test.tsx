import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import type { HomeResourceGroupSectionDTO } from "@/lib/cms/types";

import { HomeResourceGroup } from "./HomeResourceGroup";

function makeSection(
  overrides: Partial<HomeResourceGroupSectionDTO> = {},
): HomeResourceGroupSectionDTO {
  return {
    __component: "sections.home-resource-group",
    group: "services",
    heading: "Test Group",
    intro: null,
    items: [
      {
        title: "Resource A",
        description: "<p>Desc A</p>",
        image: null,
        targetPage: { documentId: "1", slug: "page-a", title: "Page A" },
        targetUrl: null,
      },
      {
        title: "Resource B",
        description: "<p>Desc B</p>",
        image: null,
        targetPage: { documentId: "2", slug: "page-b", title: "Page B" },
        targetUrl: null,
      },
    ],
    viewAllTarget: null,
    viewAllLabel: null,
    ...overrides,
  };
}

describe("HomeResourceGroup", () => {
  it("renders nothing when items are empty", () => {
    const section = makeSection({ items: [] });
    const { container } = render(
      <HomeResourceGroup section={section} locale="el" learnMoreLabel="Learn more" />,
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders the group heading", () => {
    const section = makeSection({ heading: "Υπηρεσίες" });
    render(<HomeResourceGroup section={section} locale="el" learnMoreLabel="Μάθετε περισσότερα" />);
    expect(screen.getByRole("heading", { name: "Υπηρεσίες" })).toBeDefined();
  });

  it("renders item titles and descriptions as HTML", () => {
    const section = makeSection();
    render(<HomeResourceGroup section={section} locale="el" learnMoreLabel="Μάθετε περισσότερα" />);
    expect(screen.getByText("Resource A")).toBeDefined();
    expect(screen.getByText("Desc A")).toBeDefined();
    expect(screen.getByText("Resource B")).toBeDefined();
    expect(screen.getByText("Desc B")).toBeDefined();
  });

  it("renders learn more labels on each item", () => {
    const section = makeSection();
    render(<HomeResourceGroup section={section} locale="el" learnMoreLabel="Μάθετε περισσότερα" />);
    const labels = screen.getAllByText("Μάθετε περισσότερα");
    expect(labels).toHaveLength(2);
  });

  it("links items to their target page", () => {
    const section = makeSection();
    render(<HomeResourceGroup section={section} locale="el" learnMoreLabel="Learn more" />);
    expect(screen.getByRole("link", { name: /Resource A/ })).toHaveAttribute("href", "/el/page-a");
    expect(screen.getByRole("link", { name: /Resource B/ })).toHaveAttribute("href", "/el/page-b");
  });

  it("links items to targetUrl when provided", () => {
    const section = makeSection({
      items: [
        {
          title: "External",
          description: null,
          image: null,
          targetPage: null,
          targetUrl: "/custom-url",
        },
      ],
    });
    render(<HomeResourceGroup section={section} locale="el" learnMoreLabel="Learn more" />);
    expect(screen.getByRole("link", { name: /External/ })).toHaveAttribute("href", "/custom-url");
  });

  it("falls back to sitemap when item has no target", () => {
    const section = makeSection({
      items: [
        { title: "No target", description: null, image: null, targetPage: null, targetUrl: null },
      ],
    });
    render(<HomeResourceGroup section={section} locale="ru" learnMoreLabel="Узнать больше" />);
    expect(screen.getByRole("link", { name: /No target/ })).toHaveAttribute("href", "/ru/sitemap");
  });

  it("renders view-all link when viewAllLabel and viewAllTarget are set", () => {
    const section = makeSection({
      viewAllLabel: "Все услуги",
      viewAllTarget: { documentId: "3", slug: "yperesies", title: "Services" },
    });
    render(<HomeResourceGroup section={section} locale="ru" learnMoreLabel="Узнать больше" />);
    const viewAll = screen.getByRole("link", { name: /Все услуги/ });
    expect(viewAll).toBeDefined();
    expect(viewAll).toHaveAttribute("href", "/ru/yperesies");
  });

  it("hides view-all link when viewAllLabel is missing", () => {
    const section = makeSection({
      viewAllLabel: null,
      viewAllTarget: { documentId: "3", slug: "yperesies", title: "Services" },
    });
    render(<HomeResourceGroup section={section} locale="el" learnMoreLabel="Learn more" />);
    expect(screen.queryByRole("link", { name: /→/ })).toBeNull();
    // verify no view-all link — only item links exist
    expect(screen.getAllByRole("link")).toHaveLength(2);
  });

  it("renders all items (no slice limit)", () => {
    const items = Array.from({ length: 10 }, (_, i) => ({
      title: `Item ${i + 1}`,
      description: null,
      image: null,
      targetPage: { documentId: `${i}`, slug: `item-${i + 1}`, title: `Item ${i + 1}` },
      targetUrl: null,
    }));
    const section = makeSection({ items });
    render(<HomeResourceGroup section={section} locale="el" learnMoreLabel="Learn more" />);
    expect(screen.getAllByRole("link")).toHaveLength(10);
  });

  it("preserves group field from section", () => {
    const opsSection = makeSection({ group: "operations", heading: "Επεμβάσεις" });
    expect(opsSection.group).toBe("operations");

    const svcSection = makeSection({ group: "services", heading: "Υπηρεσίες" });
    expect(svcSection.group).toBe("services");
  });

  it("renders group with operations heading", () => {
    const section = makeSection({ group: "operations", heading: "ЛОР Операции" });
    render(<HomeResourceGroup section={section} locale="ru" learnMoreLabel="Узнать больше" />);
    expect(screen.getByRole("heading", { name: "ЛОР Операции" })).toBeDefined();
  });
});
