import { beforeEach, describe, expect, it, vi } from "vitest";

const mockFiles = vi.hoisted(() => ({}) as Record<string, string>);

vi.mock("node:fs", () => {
  const readFileSync = vi.fn().mockImplementation((path: string) => {
    for (const [key, content] of Object.entries(mockFiles)) {
      if (path.endsWith(key)) {
        return content;
      }
    }
    return "";
  });
  return { default: { readFileSync }, readFileSync };
});

beforeEach(() => {
  vi.clearAllMocks();
  for (const key of Object.keys(mockFiles)) {
    delete mockFiles[key];
  }
});

function setMockYaml(filename: string, content: string) {
  mockFiles[filename] = content;
}

describe("loadSynonyms", () => {
  it("parses valid YAML into correct Meilisearch API shape", async () => {
    setMockYaml(
      "synonyms.el.yaml",
      [
        '- ["ρινοπλαστική", "διόρθωση μύτης", "πλαστική μύτης"]',
        '- ["βλεφαροπλαστική", "διόρθωση βλεφάρων"]',
      ].join("\n"),
    );

    const { loadSynonyms } = await import("./synonyms");
    const result = loadSynonyms("el");

    expect(result).toEqual({
      ρινοπλαστική: ["διόρθωση μύτης", "πλαστική μύτης"],
      "διόρθωση μύτης": ["ρινοπλαστική", "πλαστική μύτης"],
      "πλαστική μύτης": ["ρινοπλαστική", "διόρθωση μύτης"],
      βλεφαροπλαστική: ["διόρθωση βλεφάρων"],
      "διόρθωση βλεφάρων": ["βλεφαροπλαστική"],
    });
  });

  it("returns empty object for non-array YAML", async () => {
    setMockYaml("synonyms.el.yaml", "just: a string");

    const { loadSynonyms } = await import("./synonyms");
    const result = loadSynonyms("el");

    expect(result).toEqual({});
  });

  it("skips groups with fewer than 2 valid terms", async () => {
    setMockYaml("synonyms.el.yaml", '- ["ρινοπλαστική"]');

    const { loadSynonyms } = await import("./synonyms");
    const result = loadSynonyms("el");

    expect(result).toEqual({});
  });

  it("returns empty object for empty YAML", async () => {
    setMockYaml("synonyms.el.yaml", "");

    const { loadSynonyms } = await import("./synonyms");
    const result = loadSynonyms("el");

    expect(result).toEqual({});
  });
});

describe("loadStopWords", () => {
  it("parses valid YAML into an array", async () => {
    setMockYaml("stopwords.el.yaml", ['- "ο"', '- "η"', '- "το"'].join("\n"));

    const { loadStopWords } = await import("./synonyms");
    const result = loadStopWords("el");

    expect(result).toEqual(["ο", "η", "το"]);
  });

  it("returns empty array for non-array YAML", async () => {
    setMockYaml("stopwords.el.yaml", "value: 123");

    const { loadStopWords } = await import("./synonyms");
    const result = loadStopWords("el");

    expect(result).toEqual([]);
  });

  it("returns empty array for empty YAML", async () => {
    setMockYaml("stopwords.el.yaml", "");

    const { loadStopWords } = await import("./synonyms");
    const result = loadStopWords("el");

    expect(result).toEqual([]);
  });
});

describe("per-locale isolation", () => {
  it("Greek YAML never bleeds into Russian output", async () => {
    setMockYaml("synonyms.el.yaml", '- ["ρινοπλαστική", "διόρθωση μύτης"]');
    setMockYaml("synonyms.ru.yaml", '- ["ринопластика", "исправление носа"]');

    const { loadSynonyms } = await import("./synonyms");
    const ruResult = loadSynonyms("ru");

    expect(ruResult).toEqual({
      ринопластика: ["исправление носа"],
      "исправление носа": ["ринопластика"],
    });
    expect(Object.keys(ruResult)).not.toContain("ρινοπλαστική");
  });
});

describe("loadSynonymsAndStopWords", () => {
  it("loads both synonyms and stop words for a locale", async () => {
    setMockYaml("synonyms.el.yaml", '- ["a", "b"]');
    setMockYaml("stopwords.el.yaml", ['- "x"', '- "y"'].join("\n"));

    const { loadSynonymsAndStopWords } = await import("./synonyms");
    const result = loadSynonymsAndStopWords("el");

    expect(result).toEqual({
      synonyms: { a: ["b"], b: ["a"] },
      stopWords: ["x", "y"],
    });
  });
});
