import Link from "next/link";

import { MetricCard } from "@/components/metric-card";
import { SearchPanel } from "@/components/search-panel";
import { getLatestSnapshotId, getManifest, getSnapshotData } from "@/lib/data";
import { formatPercentage, formatSnapshotDate } from "@/lib/format";

export default async function HomePage() {
  const manifest = await getManifest();
  const latestSnapshotId = await getLatestSnapshotId();
  const snapshot = await getSnapshotData(latestSnapshotId);
  const watchlistCodes = ["BREN", "BUMI", "BUVA", "CUAN", "DEWA", "ENRG", "PTRO", "RAJA", "RATU", "SUPA", "VKTR"];
  const featuredIssuers = watchlistCodes
    .map((code) => snapshot.issuersByCode[code])
    .filter(Boolean)
    .sort((a, b) => a.shareCode.localeCompare(b.shareCode));

  return (
    <div className="max-w-7xl mx-auto space-y-8 pb-10 px-6 lg:px-8">
      <SearchPanel snapshotId={latestSnapshotId} />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Latest Snapshot" value={formatSnapshotDate(latestSnapshotId)} tone="marine" />
        <MetricCard label="Companies" value={snapshot.snapshot.issuerCount.toString()} />
        <MetricCard label="Investors" value={snapshot.snapshot.investorCount.toString()} />
        <MetricCard label="Warnings" value={snapshot.snapshot.warningCount.toString()} tone="accent" />
      </section>

      <section>
        <div className="rounded-3xl border border-border bg-background-alt p-8 shadow-soft lg:p-10">
          <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-6 mb-8">
            <div>
              <p className="text-sm font-semibold text-accent mb-2 uppercase tracking-wide">Personal Watchlist</p>
              <h2 className="text-3xl font-bold text-foreground tracking-tight">Tracked companies</h2>
            </div>
            <div className="rounded-full bg-border/50 px-4 py-1.5 text-xs font-medium text-foreground-muted">
              {manifest.snapshots.length} snapshot ready in pipeline
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {featuredIssuers.map((issuer) => (
              <Link
                key={issuer.shareCode}
                href={`/snapshots/${latestSnapshotId}/issuers/${issuer.shareCode}`}
                className="group rounded-2xl border border-border bg-background p-6 transition-all hover:border-accent/40 hover:shadow-md hover:-translate-y-1"
              >
                <div className="flex flex-col h-full justify-between gap-4">
                  <div>
                    <div className="flex items-center justify-between mb-2">
                       <span className="inline-flex items-center justify-center rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-bold text-accent transition-colors group-hover:bg-accent group-hover:text-white">
                         {issuer.shareCode}
                       </span>
                    </div>
                    <h3 className="text-xl font-bold text-foreground line-clamp-1" title={issuer.issuerName}>{issuer.issuerName}</h3>
                    <p className="mt-1 text-sm text-foreground-muted">{issuer.holderCount} disclosed holders</p>
                  </div>
                  <div className="pt-4 border-t border-border/50 mt-auto">
                    <p className="text-xs text-foreground-muted mb-1 font-medium">Known disclosed</p>
                    <p className="text-2xl font-bold text-foreground">{formatPercentage(issuer.knownDisclosedPercentageSum)}</p>
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
