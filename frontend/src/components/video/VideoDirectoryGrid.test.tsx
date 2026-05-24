import { describe, expect, it } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { VideoDirectoryGrid } from "./VideoDirectoryGrid";
import type { VideoEntryDTO } from "@/lib/cms/types";

const entries: VideoEntryDTO[] = [
  {
    documentId: "v1",
    locale: "el",
    title: "Ενδοσκοπική διαφραγματοπλαστική",
    youtubeId: "abc123",
    youtubeUrl: "https://www.youtube.com/watch?v=abc123",
    categories: [{ slug: "ρινος", label: "Ρινός" }],
    sortOrder: 1,
    relatedArticle: { documentId: "p1", slug: "skoliosi", title: "Στραβό διάφραγμα" },
    legacyArticleUrl: null,
  },
  {
    documentId: "v2",
    locale: "el",
    title: "Χρόνια αμυγδαλίτιδα",
    youtubeId: "def456",
    youtubeUrl: null,
    categories: [{ slug: "παιδο-ωρλ", label: "Παιδο-ΩΡΛ" }],
    sortOrder: 2,
    relatedArticle: null,
    legacyArticleUrl: "http://myorl.gr/#",
  },
];

function makeManyEntries(count: number): VideoEntryDTO[] {
  return Array.from({ length: count }, (_, index) => ({
    documentId: `v-many-${index}`,
    locale: "el" as const,
    title: `Video ${index + 1}`,
    youtubeId: `id${index}`,
    youtubeUrl: null,
    categories: [],
    sortOrder: index,
    relatedArticle: null,
    legacyArticleUrl: null,
  }));
}

describe("VideoDirectoryGrid", () => {
  it("renders video rows and category filters", () => {
    render(<VideoDirectoryGrid entries={entries} locale="el" />);

    expect(screen.getByText(entries[0]!.title)).toBeDefined();
    expect(screen.getByText(entries[1]!.title)).toBeDefined();
    expect(screen.getByRole("button", { name: "Ρινός" })).toBeDefined();
    expect(screen.queryByRole("link", { name: "Διαβάστε περισσότερα για το θέμα" })).toBeNull();
  });

  it("filters entries by category", async () => {
    const user = userEvent.setup();
    render(<VideoDirectoryGrid entries={entries} locale="el" />);

    await user.click(screen.getByRole("button", { name: "Παιδο-ΩΡΛ" }));

    expect(screen.getByText(entries[1]!.title)).toBeDefined();
    expect(screen.queryByText(entries[0]!.title)).toBeNull();
  });

  it("shows the first 12 entries then loads more", async () => {
    const user = userEvent.setup();
    const many = makeManyEntries(15);
    render(<VideoDirectoryGrid entries={many} locale="el" />);

    expect(document.querySelectorAll("[data-video-directory] ol > li")).toHaveLength(12);
    expect(screen.getByRole("button", { name: "Περισσότερα (+3)" })).toBeDefined();

    await user.click(screen.getByRole("button", { name: "Περισσότερα (+3)" }));

    expect(document.querySelectorAll("[data-video-directory] ol > li")).toHaveLength(15);
    expect(screen.queryByRole("button", { name: "Περισσότερα (+3)" })).toBeNull();
  });

  it("resets visible count when the category filter changes", async () => {
    const user = userEvent.setup();
    const manyRhino = makeManyEntries(14).map((entry, index) => ({
      ...entry,
      documentId: `rhino-${index}`,
      categories: [{ slug: "ρινος", label: "Ρινός" }],
    }));
    const pedEntry: VideoEntryDTO = {
      ...entries[1]!,
      documentId: "ped-only",
    };
    render(<VideoDirectoryGrid entries={[...manyRhino, pedEntry]} locale="el" />);

    await user.click(screen.getByRole("button", { name: "Περισσότερα (+3)" }));
    expect(document.querySelectorAll("[data-video-directory] ol > li")).toHaveLength(15);

    await user.click(screen.getByRole("button", { name: "Παιδο-ΩΡΛ" }));

    expect(document.querySelectorAll("[data-video-directory] ol > li")).toHaveLength(1);
    expect(screen.queryByRole("button", { name: /Περισσότερα/ })).toBeNull();
  });

  it("expands one video at a time and reveals its related article", async () => {
    const user = userEvent.setup();
    render(<VideoDirectoryGrid entries={entries} locale="el" />);

    expect(document.querySelector("iframe")).toBeNull();
    expect(screen.queryByRole("link", { name: "Διαβάστε περισσότερα για το θέμα" })).toBeNull();

    await user.click(screen.getByText(entries[0]!.title));

    expect(document.querySelector("iframe")).toHaveAttribute("title", entries[0]!.title);
    expect(screen.getByRole("link", { name: "Διαβάστε περισσότερα για το θέμα" })).toHaveAttribute(
      "href",
      "/el/skoliosi",
    );

    await user.click(
      screen.getByRole("button", {
        name: `Αναπαραγωγή βίντεο: ${entries[1]!.title}`,
      }),
    );

    expect(screen.getByTitle(entries[1]!.title)).toBeDefined();
    expect(screen.queryByTitle(entries[0]!.title)).toBeNull();
    expect(screen.queryByRole("link", { name: "Διαβάστε περισσότερα για το θέμα" })).toBeNull();
  });
});
