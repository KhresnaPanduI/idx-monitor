import Link from "next/link";

import { MetricCard } from "@/components/metric-card";
import { SearchPanel } from "@/components/search-panel";
import { getLatestSnapshotId, getManifest, getSnapshotData } from "@/lib/data";
import { formatPercentage, formatSnapshotDate } from "@/lib/format";

export default async function HomePage() {
  const manifest = await getManifest();
  const latestSnapshotId = await getLatestSnapshotId();
  const snapshot = await getSnapshotData(latestSnapshotId);
  const featuredIssuers = Object.values(snapshot.issuersByCode)
    .sort((left, right) => right.knownDisclosedPercentageSum - left.knownDisclosedPercentageSum)
    .slice(0, 6);

  return (
    <div className="space-y-8 pb-10">
      <SearchPanel snapshotId={latestSnapshotId} />

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Latest Snapshot" value={formatSnapshotDate(latestSnapshotId)} tone="marine" />
        <MetricCard label="Issuers" value={snapshot.snapshot.issuerCount.toString()} />
        <MetricCard label="Investors" value={snapshot.snapshot.investorCount.toString()} />
        <MetricCard label="Warnings" value={snapshot.snapshot.warningCount.toString()} tone="accent" />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
        <div className="panel p-6 sm:p-8">
          <div className="flex items-end justify-between gap-4">
            <div>
              <p className="text-sm uppercase tracking-[0.22em] text-pine/70">High coverage issuers</p>
              <h2 className="mt-2 text-3xl font-semibold text-ink">Fast entry points for research</h2>
            </div>
            <div className="text-sm text-ink/55">{manifest.snapshots.length} snapshot ready in pipeline</div>
          </div>

          <div className="mt-6 grid gap-4">
            {featuredIssuers.map((issuer) => (
              <Link
                key={issuer.shareCode}
                href={`/snapshots/${latestSnapshotId}/issuers/${issuer.shareCode}`}
                className="rounded-[24px] border border-ink/10 bg-paper/70 p-5 transition hover:-translate-y-0.5 hover:border-pine/25"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.2em] text-ink/45">{issuer.shareCode}</p>
                    <h3 className="mt-1 text-xl font-semibold text-ink">{issuer.issuerName}</h3>
                    <p className="mt-2 text-sm text-ink/60">{issuer.holderCount} disclosed holders in latest file</p>
                  </div>
                  <div className="rounded-2xl bg-pine px-4 py-3 text-right text-white">
                    <p className="text-xs uppercase tracking-[0.18em] text-white/70">Known disclosed</p>
                    <p className="text-2xl font-semibold">{formatPercentage(issuer.knownDisclosedPercentageSum)}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>

        <div className="panel p-6 sm:p-8">
          <p className="text-sm uppercase tracking-[0.22em] text-pine/70">Why this helps</p>
          <h2 className="mt-2 text-3xl font-semibold text-ink">Read the ownership story, not raw rows</h2>
          <div className="mt-6 space-y-5 text-sm leading-7 text-ink/68">
            <p>See the disclosed ownership concentration for each issuer and estimate the remainder still held below the public threshold.</p>
            <p>Jump from an issuer to its investors, then follow the same investor into other issuers with a bounded multi-hop graph.</p>
            <p>Use full investor type labels and cleaner geography values so scanning is easier than the source CSV.</p>
          </div>
        </div>
      </section>
    </div>
  );
}
