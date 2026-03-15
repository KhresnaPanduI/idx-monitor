"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { motion } from "framer-motion";

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
    <section className="rounded-3xl bg-background-alt p-8 shadow-soft border border-border lg:p-12 mb-8">
      <div className="flex flex-col gap-10">
        <div className="max-w-3xl">
          <h1 className="font-display text-5xl font-bold text-foreground tracking-tight">
            Trace issuer ownership and investor links without opening the CSV manually.
          </h1>
          <p className="mt-6 max-w-2xl text-lg text-foreground-muted leading-relaxed">
            Search stock codes, issuer names, or investor names. Then pivot into tables and bounded multi-hop
            graphs for the latest KSEI snapshot.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-background p-6 lg:p-8 shadow-inner">
          <div className="mb-6 flex flex-wrap gap-2">
            {[
              ["all", "All"],
              ["issuer", "Issuers"],
              ["investor", "Investors"],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setTab(value as typeof tab)}
                className={`rounded-full px-6 py-2.5 text-sm font-medium transition-all ${
                  tab === value ? "bg-accent text-white shadow-md shadow-accent/20" : "bg-background-alt text-foreground-muted hover:text-foreground hover:bg-border/50 border border-border"
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
            className="w-full rounded-2xl border border-border bg-background-alt px-6 py-5 text-lg text-foreground placeholder-foreground-muted/60 outline-none transition-all focus:border-accent focus:ring-4 focus:ring-accent/10"
          />

          <div className="mt-6 grid gap-4">
            {results.map((result) => (
              <Link
                key={`${result.type}:${result.id}`}
                href={result.path}
                className="group rounded-2xl border border-border bg-white p-5 transition-all hover:border-accent/40 hover:shadow-md"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs font-semibold text-accent/80 uppercase tracking-wider">{result.type}</p>
                    <p className="mt-2 text-xl font-bold text-foreground group-hover:text-accent transition-colors">{result.title}</p>
                    <p className="mt-1 text-sm text-foreground-muted">{result.subtitle}</p>
                  </div>
                  <p className="max-w-sm text-right text-sm text-foreground-muted">{result.description}</p>
                </div>
              </Link>
            ))}
            {!results.length && (
              <div className="rounded-2xl border-2 border-dashed border-border p-10 text-center text-foreground-muted bg-white/50">
                No results yet. Try a stock code, issuer name, or investor name.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

