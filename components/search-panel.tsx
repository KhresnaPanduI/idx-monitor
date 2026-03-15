"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { searchEntries } from "@/lib/search";
import type { SearchEntry, SearchIndex } from "@/lib/types";

type SearchPanelProps = {
  snapshotId: string;
};

export function SearchPanel({ snapshotId }: SearchPanelProps) {
  const [entries, setEntries] = useState<SearchEntry[]>([]);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<"all" | "issuer" | "investor">("all");

  useEffect(() => {
    let ignore = false;

    async function load() {
      const response = await fetch(`/generated/snapshots/${snapshotId}/search-index.json`);
      const payload = (await response.json()) as SearchIndex;
      if (!ignore) {
        setEntries(payload.entries);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [snapshotId]);

  const results = searchEntries(entries, query, tab);

  return (
    <section className="panel grid-noise overflow-hidden p-6 sm:p-8">
      <div className="flex flex-col gap-6">
        <div className="max-w-3xl">
          <p className="text-sm uppercase tracking-[0.22em] text-pine/70">Search-first workflow</p>
          <h1 className="mt-3 font-display text-5xl leading-tight text-ink sm:text-6xl">
            Trace issuer ownership and investor links without opening the CSV manually.
          </h1>
          <p className="mt-4 max-w-2xl text-lg text-ink/72">
            Search stock codes, issuer names, or investor names. Then pivot into tables and bounded multi-hop
            graphs for the latest KSEI snapshot.
          </p>
        </div>

        <div className="rounded-[28px] border border-ink/10 bg-white/90 p-4 shadow-panel">
          <div className="mb-3 flex flex-wrap gap-2">
            {[
              ["all", "All"],
              ["issuer", "Issuers"],
              ["investor", "Investors"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value as typeof tab)}
                className={`rounded-full px-4 py-2 text-sm font-medium transition ${
                  tab === value ? "bg-pine text-white" : "bg-ink/5 text-ink/70 hover:bg-ink/10"
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search AADI, GOTO, ADARO, TIMOTHY SIDDIK SHU..."
            className="w-full rounded-2xl border border-ink/10 bg-paper px-5 py-4 text-lg outline-none transition focus:border-pine focus:ring-2 focus:ring-pine/15"
          />

          <div className="mt-4 grid gap-3">
            {results.map((result) => (
              <Link
                key={`${result.type}:${result.id}`}
                href={result.path}
                className="rounded-2xl border border-ink/10 bg-white px-4 py-4 transition hover:-translate-y-0.5 hover:border-pine/25 hover:shadow-lg"
              >
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-[0.22em] text-ink/45">{result.type}</p>
                    <p className="mt-1 text-lg font-semibold text-ink">{result.title}</p>
                    <p className="text-sm text-ink/60">{result.subtitle}</p>
                  </div>
                  <p className="max-w-sm text-right text-sm text-ink/55">{result.description}</p>
                </div>
              </Link>
            ))}
            {!results.length && (
              <div className="rounded-2xl border border-dashed border-ink/15 bg-paper px-4 py-5 text-sm text-ink/55">
                No results yet. Try a stock code, issuer name, or investor name.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
