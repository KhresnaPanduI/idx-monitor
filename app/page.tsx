import Link from "next/link";

import { SearchPanel } from "@/components/search-panel";
import { getLatestSnapshotId, getSnapshotData } from "@/lib/data";
import { formatPercentage } from "@/lib/format";

export default async function HomePage() {
  const latestSnapshotId = await getLatestSnapshotId();
  const snapshot = await getSnapshotData(latestSnapshotId);
  const watchlistCodes = ["BREN", "BUMI", "BUVA", "CUAN", "DEWA", "ENRG", "PTRO", "RAJA", "RATU", "SUPA", "VKTR"];
  const featuredIssuers = watchlistCodes
    .map((code) => snapshot.issuersByCode[code])
    .filter(Boolean);

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 px-6 lg:px-8">
      <SearchPanel snapshotId={latestSnapshotId} />

      <section>
        <div className="rounded-3xl border border-border bg-background-alt p-8 shadow-soft lg:p-10">
          <div className="mb-8">
            <p className="text-sm font-semibold text-accent mb-2 uppercase tracking-wide">Personal Watchlist</p>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Tracked companies</h2>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredIssuers.map((issuer) => (
              <Link
                key={issuer.shareCode}
                href={`/snapshots/${latestSnapshotId}/issuers/${issuer.shareCode}`}
                className="group rounded-2xl border border-border bg-background p-6 transition-all hover:border-accent/40 hover:shadow-md hover:-translate-y-1"
              >
                <div className="flex h-full flex-col justify-between gap-4">
                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="inline-flex items-center justify-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                        {issuer.shareCode}
                      </span>
                    </div>
                    <h3 className="line-clamp-1 text-xl font-bold text-foreground" title={issuer.issuerName}>
                      {issuer.issuerName}
                    </h3>
                    <p className="mt-1 text-sm text-foreground-muted">{issuer.holderCount} disclosed holders</p>
                  </div>
                  <div className="mt-auto border-t border-border/50 pt-4">
                    <p className="mb-1 text-xs font-medium text-foreground-muted">Known disclosed</p>
                    <p className="text-2xl font-bold text-foreground">
                      {formatPercentage(issuer.knownDisclosedPercentageSum)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}
