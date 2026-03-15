import type { SearchEntry } from "@/lib/types";

function normalize(value: string): string {
  return value.toLowerCase().trim();
}

function scoreTerm(term: string, query: string): number {
  const normalizedTerm = normalize(term);
  if (!normalizedTerm) return 0;
  if (normalizedTerm === query) return 120;
  if (normalizedTerm.startsWith(query)) return 90;
  if (normalizedTerm.includes(query)) return 70;

  let pointer = 0;
  for (const char of normalizedTerm) {
    if (char === query[pointer]) {
      pointer += 1;
    }
    if (pointer === query.length) {
      return 50;
    }
  }

  return 0;
}

export function searchEntries(
  entries: SearchEntry[],
  query: string,
  filter: "all" | "issuer" | "investor" = "all",
): SearchEntry[] {
  const normalizedQuery = normalize(query);
  if (!normalizedQuery) {
    return entries
      .filter((entry) => filter === "all" || entry.type === filter)
      .slice(0, 12);
  }

  return entries
    .filter((entry) => filter === "all" || entry.type === filter)
    .map((entry) => {
      const score = Math.max(...entry.terms.map((term) => scoreTerm(term, normalizedQuery)));
      return { entry, score };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => {
      if (right.score !== left.score) return right.score - left.score;
      return left.entry.title.localeCompare(right.entry.title);
    })
    .slice(0, 24)
    .map((item) => item.entry);
}
