"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";

type CompanyOption = {
  shareCode: string;
  issuerName: string;
};

type CompanySwitcherProps = {
  snapshotId: string;
  companies: CompanyOption[];
  currentShareCode?: string;
};

export function CompanySwitcher({ snapshotId, companies, currentShareCode }: CompanySwitcherProps) {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const normalizedQuery = query.trim().toLowerCase();

  const visibleCompanies = useMemo(() => {
    if (!normalizedQuery) {
      return [];
    }

    return companies
      .filter((company) => company.shareCode !== currentShareCode)
      .filter((company) =>
        `${company.shareCode} ${company.issuerName}`.toLowerCase().includes(normalizedQuery),
      )
      .slice(0, 6);
  }, [companies, currentShareCode, normalizedQuery]);

  const handleSubmit = () => {
    const firstResult = visibleCompanies[0];
    if (!firstResult) {
      return;
    }

    router.push(`/snapshots/${snapshotId}/issuers/${firstResult.shareCode}`);
    setQuery("");
  };

  return (
    <div className="relative w-full max-w-md">
      <label htmlFor="company-switcher" className="sr-only">
        Search another company
      </label>
      <input
        id="company-switcher"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        onKeyDown={(event) => {
          if (event.key === "Enter") {
            event.preventDefault();
            handleSubmit();
          }
          if (event.key === "Escape") {
            setQuery("");
          }
        }}
        placeholder="Search another company or stock code..."
        className="w-full rounded-2xl border border-border bg-background px-5 py-4 text-sm text-foreground outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10"
      />

      {normalizedQuery && (
        <div className="absolute left-0 right-0 top-[calc(100%+0.75rem)] z-20 overflow-hidden rounded-2xl border border-border bg-white shadow-float">
          {visibleCompanies.length ? (
            <div className="max-h-80 overflow-auto p-2">
              {visibleCompanies.map((company) => (
                <Link
                  key={company.shareCode}
                  href={`/snapshots/${snapshotId}/issuers/${company.shareCode}`}
                  className="block rounded-xl px-4 py-3 transition-colors hover:bg-background-alt"
                  onClick={() => setQuery("")}
                >
                  <p className="text-sm font-semibold text-foreground">{company.shareCode}</p>
                  <p className="mt-1 text-sm text-foreground-muted line-clamp-1">{company.issuerName}</p>
                </Link>
              ))}
            </div>
          ) : (
            <div className="px-4 py-4 text-sm text-foreground-muted">No companies match that search.</div>
          )}
        </div>
      )}
    </div>
  );
}
