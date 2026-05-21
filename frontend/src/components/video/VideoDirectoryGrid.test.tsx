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

describe("VideoDirectoryGrid", () => {
  it("renders video cards and category filters", () => {
    render(<VideoDirectoryGrid entries={entries} locale="el" />);

    expect(screen.getByRole("heading", { name: entries[0]!.title })).toBeDefined();
    expect(screen.getByRole("heading", { name: entries[1]!.title })).toBeDefined();
    expect(screen.getByRole("button", { name: "Ρινός" })).toBeDefined();
    expect(screen.getByRole("link", { name: "Διαβάστε περισσότερα" })).toHaveAttribute(
      "href",
      "/el/skoliosi",
    );
    expect(screen.queryAllByRole("link", { name: "Διαβάστε περισσότερα" })).toHaveLength(1);
  });

  it("filters entries by category", async () => {
    const user = userEvent.setup();
    render(<VideoDirectoryGrid entries={entries} locale="el" />);

    await user.click(screen.getByRole("button", { name: "Παιδο-ΩΡΛ" }));

    expect(screen.getByRole("heading", { name: entries[1]!.title })).toBeDefined();
    expect(screen.queryByRole("heading", { name: entries[0]!.title })).toBeNull();
  });

  it("loads iframe only after play is activated", async () => {
    const user = userEvent.setup();
    render(<VideoDirectoryGrid entries={[entries[0]!]} locale="el" />);

    expect(document.querySelector("iframe")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Αναπαραγωγή βίντεο" }));
    expect(document.querySelector("iframe")).toBeTruthy();
  });
});
