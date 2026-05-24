import { readFileSync } from "node:fs";
import { join } from "node:path";

import yaml from "js-yaml";

import type { Locale } from "@/lib/cms/types";

export type SynonymDict = Record<string, string[]>;

export type SynonymStopWords = {
  synonyms: SynonymDict;
  stopWords: string[];
};

function yamlPath(name: string): string {
  return join(process.cwd(), "src", "lib", "search", name);
}

export function loadSynonyms(locale: Locale): SynonymDict {
  const raw = yaml.load(readFileSync(yamlPath(`synonyms.${locale}.yaml`), "utf-8"));

  if (!Array.isArray(raw)) {
    return {};
  }

  const dict: SynonymDict = {};

  for (const group of raw) {
    if (!Array.isArray(group) || group.length < 2) {
      continue;
    }

    const terms = group.filter((t): t is string => typeof t === "string" && t.trim().length > 0);

    if (terms.length < 2) {
      continue;
    }

    for (const term of terms) {
      const existing = dict[term];
      if (existing) {
        const merged = new Set([...existing, ...terms.filter((t) => t !== term)]);
        dict[term] = [...merged];
      } else {
        dict[term] = terms.filter((t) => t !== term);
      }
    }
  }

  return dict;
}

export function loadStopWords(locale: Locale): string[] {
  const raw = yaml.load(readFileSync(yamlPath(`stopwords.${locale}.yaml`), "utf-8"));

  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.filter((w): w is string => typeof w === "string" && w.trim().length > 0);
}

export function loadSynonymsAndStopWords(locale: Locale): SynonymStopWords {
  return {
    synonyms: loadSynonyms(locale),
    stopWords: loadStopWords(locale),
  };
}
