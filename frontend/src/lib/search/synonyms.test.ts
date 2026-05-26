import { join } from "node:path";

import yaml from "js-yaml";
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

describe("seed list validation", () => {
  async function readYamlFile(filename: string): Promise<unknown> {
    const actual = await vi.importActual<typeof import("node:fs")>("node:fs");
    const filePath = join(import.meta.dirname, filename);
    return yaml.load(actual.readFileSync(filePath, "utf-8"));
  }

  async function readGroups(locale: string): Promise<string[][]> {
    const raw = await readYamlFile(`synonyms.${locale}.yaml`);
    if (!Array.isArray(raw)) return [];
    return raw.filter(
      (g): g is string[] =>
        Array.isArray(g) &&
        g.filter((t): t is string => typeof t === "string" && t.trim().length > 0).length >= 2,
    );
  }

  async function readStopWords(locale: string): Promise<string[]> {
    const raw = await readYamlFile(`stopwords.${locale}.yaml`);
    if (!Array.isArray(raw)) return [];
    return raw.filter((w): w is string => typeof w === "string" && w.trim().length > 0);
  }

  it("el synonym file has ≥ 30 groups", async () => {
    const groups = await readGroups("el");
    expect(groups.length).toBeGreaterThanOrEqual(30);
  });

  it("ru synonym file has ≥ 30 groups", async () => {
    const groups = await readGroups("ru");
    expect(groups.length).toBeGreaterThanOrEqual(30);
  });

  it("every synonym group in el has ≥ 2 terms", async () => {
    const raw = await readYamlFile("synonyms.el.yaml");
    if (!Array.isArray(raw)) return;
    for (let i = 0; i < raw.length; i++) {
      const group = raw[i];
      if (!Array.isArray(group)) continue;
      const terms = group.filter(
        (t): t is string => typeof t === "string" && t.trim().length > 0,
      );
      if (terms.length > 0) {
        expect(
          terms.length,
          `group ${i} has < 2 terms: [${terms.join(", ")}]`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("every synonym group in ru has ≥ 2 terms", async () => {
    const raw = await readYamlFile("synonyms.ru.yaml");
    if (!Array.isArray(raw)) return;
    for (let i = 0; i < raw.length; i++) {
      const group = raw[i];
      if (!Array.isArray(group)) continue;
      const terms = group.filter(
        (t): t is string => typeof t === "string" && t.trim().length > 0,
      );
      if (terms.length > 0) {
        expect(
          terms.length,
          `group ${i} has < 2 terms: [${terms.join(", ")}]`,
        ).toBeGreaterThanOrEqual(2);
      }
    }
  });

  it("cross-locale abbreviations appear in both locale files (ORL/ENT)", async () => {
    const elGroups = await readGroups("el");
    const ruGroups = await readGroups("ru");

    const elHasORL = elGroups.some(
      (g) => g.includes("ΩΡΛ") || g.includes("ORL") || g.includes("ENT"),
    );
    const ruHasORL = ruGroups.some(
      (g) => g.includes("ЛОР") || g.includes("ORL") || g.includes("ENT"),
    );

    expect(elHasORL).toBe(true);
    expect(ruHasORL).toBe(true);
  });

  it("cross-locale abbreviations appear in both locale files (FESS)", async () => {
    const elGroups = await readGroups("el");
    const ruGroups = await readGroups("ru");

    const elHasFESS = elGroups.some((g) => g.some((t) => t.toLowerCase() === "fess"));
    const ruHasFESS = ruGroups.some((g) => g.some((t) => t.toLowerCase() === "fess"));

    expect(elHasFESS).toBe(true);
    expect(ruHasFESS).toBe(true);
  });

  it("cross-locale abbreviations appear in both locale files (DCR)", async () => {
    const elGroups = await readGroups("el");
    const ruGroups = await readGroups("ru");

    const elHasDCR = elGroups.some((g) => g.some((t) => t.toUpperCase() === "DCR"));
    const ruHasDCR = ruGroups.some((g) => g.some((t) => t.toUpperCase() === "DCR"));

    expect(elHasDCR).toBe(true);
    expect(ruHasDCR).toBe(true);
  });

  it("stopwords el has ≥ 10 entries", async () => {
    const words = await readStopWords("el");
    expect(words.length).toBeGreaterThanOrEqual(10);
  });

  it("stopwords ru has ≥ 10 entries", async () => {
    const words = await readStopWords("ru");
    expect(words.length).toBeGreaterThanOrEqual(10);
  });
});
