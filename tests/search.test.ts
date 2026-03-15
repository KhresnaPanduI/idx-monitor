import { describe, expect, it } from "vitest";

import { searchEntries } from "@/lib/search";
import type { SearchEntry } from "@/lib/types";

const entries: SearchEntry[] = [
  {
    type: "issuer",
    id: "AADI",
    title: "AADI",
    subtitle: "ADARO ANDALAN INDONESIA Tbk",
    description: "10 disclosed holders",
    path: "/snapshots/2026-02-27/issuers/AADI",
    terms: ["AADI", "ADARO ANDALAN INDONESIA Tbk"],
  },
  {
    type: "investor",
    id: "garibaldi",
    title: "GARIBALDI THOHIR",
    subtitle: "1 issuer in snapshot",
    description: "ADARO ANDALAN INDONESIA Tbk",
    path: "/snapshots/2026-02-27/investors/garibaldi",
    terms: ["GARIBALDI THOHIR", "ADARO ANDALAN INDONESIA Tbk"],
  },
];

describe("searchEntries", () => {
  it("boosts exact stock code matches", () => {
    const results = searchEntries(entries, "AADI", "all");
    expect(results[0]?.id).toBe("AADI");
  });

  it("filters by entity type", () => {
    const results = searchEntries(entries, "adaro", "issuer");
    expect(results).toHaveLength(1);
    expect(results[0]?.type).toBe("issuer");
  });
});
