import { describe, expect, it } from "vitest";
import { fireEvent, render, screen, within } from "@testing-library/react";

import { DisclosureList, TabsPanel } from "@/components/sections/DisclosurePanels";
import { UnknownSection } from "@/components/sections/UnknownSection";

describe("Accessibility audit — interactive components meet WCAG AA contracts", () => {
  describe("DisclosureList (FAQ / Accordion)", () => {
    const items: Array<[string, string]> = [
      ["Question one", "<p>Answer one</p>"],
      ["Question two", "<p>Answer two</p>"],
    ];

    it("each disclosure summary has aria-expanded reflecting state", () => {
      render(<DisclosureList items={items} />);
      const buttons = screen.getAllByRole("button");
      expect(buttons).toHaveLength(2);
      buttons.forEach((b) => expect(b.getAttribute("aria-expanded")).toBe("false"));
    });

    it("aria-expanded flips to true when toggled, aria-hidden flips on body", () => {
      render(<DisclosureList items={items} />);
      const button = screen.getAllByRole("button")[0]!;
      fireEvent.click(button);
      expect(button.getAttribute("aria-expanded")).toBe("true");
      const region = document.getElementById(button.getAttribute("aria-controls")!)!;
      expect(region.getAttribute("aria-hidden")).toBe("false");
    });

    it("each disclosure summary has an accessible name from its visible label", () => {
      render(<DisclosureList items={items} />);
      const button = screen.getByRole("button", { name: /Question one/ });
      expect(button).toBeInTheDocument();
    });

    it("disclosure body has role=region and is associated via aria-controls", () => {
      render(<DisclosureList items={items} />);
      const button = screen.getAllByRole("button")[0]!;
      const panelId = button.getAttribute("aria-controls")!;
      expect(panelId).toBeTruthy();
      const region = document.getElementById(panelId)!;
      expect(region.getAttribute("role")).toBe("region");
    });

    it("single mode keeps only one panel open at a time", () => {
      render(<DisclosureList items={items} mode="single" />);
      const buttons = screen.getAllByRole("button");
      expect(buttons.length).toBeGreaterThanOrEqual(2);
      const first = buttons[0]!;
      const second = buttons[1]!;
      fireEvent.click(first);
      expect(first.getAttribute("aria-expanded")).toBe("true");
      fireEvent.click(second);
      expect(second.getAttribute("aria-expanded")).toBe("true");
      expect(first.getAttribute("aria-expanded")).toBe("false");
    });
  });

  describe("TabsPanel", () => {
    const items = [
      { title: "Tab A", content: "<p>Content A</p>", link: null },
      { title: "Tab B", content: "<p>Content B</p>", link: null },
    ];

    it("renders tabs with role=tab and aria-selected reflecting active state", () => {
      render(<TabsPanel items={items} />);
      const tabs = screen.getAllByRole("tab");
      expect(tabs).toHaveLength(2);
      expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
      expect(tabs[1]!.getAttribute("aria-selected")).toBe("false");
    });

    it("tab list is wrapped in role=tablist", () => {
      render(<TabsPanel items={items} />);
      const list = screen.getByRole("tablist");
      const tabs = within(list).getAllByRole("tab");
      expect(tabs.length).toBeGreaterThan(0);
    });

    it("active panel is associated to the active tab via aria-labelledby", () => {
      render(<TabsPanel items={items} />);
      const panel = screen.getByRole("tabpanel");
      const tabId = panel.getAttribute("aria-labelledby")!;
      expect(tabId).toBeTruthy();
      const tab = document.getElementById(tabId)!;
      expect(tab.getAttribute("aria-selected")).toBe("true");
    });

    it("supports ArrowRight keyboard navigation between tabs", () => {
      render(<TabsPanel items={items} />);
      const tabs = screen.getAllByRole("tab");
      fireEvent.keyDown(tabs[0]!, { key: "ArrowRight" });
      expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
      expect(tabs[0]!.getAttribute("aria-selected")).toBe("false");
    });

    it("supports Home/End keyboard navigation", () => {
      render(<TabsPanel items={items} />);
      const tabs = screen.getAllByRole("tab");
      fireEvent.keyDown(tabs[0]!, { key: "End" });
      expect(tabs[1]!.getAttribute("aria-selected")).toBe("true");
      fireEvent.keyDown(tabs[1]!, { key: "Home" });
      expect(tabs[0]!.getAttribute("aria-selected")).toBe("true");
    });
  });

  describe("UnknownSection (graceful fallback)", () => {
    it("uses a data-section attribute for analytics, not a hidden role", () => {
      render(
        <UnknownSection
          section={{ __component: "sections.future-component", heading: null } as never}
        />,
      );
      const node = document.querySelector("[data-section='unknown']")!;
      expect(node).toBeTruthy();
      expect(node.getAttribute("aria-hidden")).not.toBe("true");
    });
  });
});
