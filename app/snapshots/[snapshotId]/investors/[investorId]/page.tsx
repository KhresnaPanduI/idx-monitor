import Link from "next/link";
import { notFound } from "next/navigation";

import { GraphPanel } from "@/components/graph-panel";
import { InvestorPositionsTable } from "@/components/investor-positions-table";
import { MetricCard } from "@/components/metric-card";
import { getSnapshotData } from "@/lib/data";
import { formatPercentage, formatSnapshotDate } from "@/lib/format";

type InvestorPageProps = {
  params: Promise<{ snapshotId: string; investorId: string }>;
};

export default async function InvestorPage({ params }: InvestorPageProps) {
  const { snapshotId, investorId } = await params;
  const snapshot = await getSnapshotData(snapshotId);
  const investor = snapshot.investorsById[investorId];
  const rows = snapshot.investorPositions[investorId];

  if (!investor || !rows) {
    notFound();
  }

  const centerOptions = [
    {
      nodeId: `investor:${investor.investorId}`,
      label: investor.investorName,
      path: `/snapshots/${snapshotId}/investors/${investor.investorId}`,
    },
    ...rows.map((row) => ({
      nodeId: `issuer:${row.shareCode}`,
      label: `${row.shareCode} · ${row.issuerName}`,
      path: `/snapshots/${snapshotId}/issuers/${row.shareCode}`,
    })),
  ];

  return (
    <div className="space-y-8 pb-10">
      <section className="rounded-3xl border border-border bg-background-alt shadow-soft p-8 lg:p-12">
        <div className="flex flex-wrap flex-col lg:flex-row items-start lg:items-center justify-between gap-10">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-sm font-medium text-foreground-muted mb-6">
              <Link href="/" className="hover:text-foreground transition-colors">
                Home
              </Link>
              <span>/</span>
              <span>{formatSnapshotDate(snapshotId)}</span>
            </div>
            <p className="text-sm font-bold text-foreground-muted mb-3 uppercase tracking-wide">Investor Profile</p>
            <h1 className="font-display text-5xl font-bold text-foreground tracking-tight">{investor.investorName}</h1>
            <p className="mt-6 max-w-2xl text-lg text-foreground-muted leading-relaxed">
              All disclosed issuer positions connected to this investor in the selected snapshot.
            </p>
          </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-8 min-w-[300px] shadow-sm">
            <p className="text-xs font-semibold uppercase tracking-wider text-accent/80 mb-2">Largest visible position</p>
            <p className="text-2xl font-bold text-foreground leading-tight">
              <span className="text-accent">{investor.topShareCode}</span> <br/> {investor.topIssuerName}
            </p>
            <p className="mt-4 text-3xl font-bold text-accent">{formatPercentage(investor.topPercentage)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Snapshot" value={formatSnapshotDate(snapshotId)} tone="marine" />
        <MetricCard label="Positions" value={String(investor.positionCount)} />
        <MetricCard label="Issuers" value={String(investor.issuerCount)} />
        <MetricCard label="Top ownership" value={formatPercentage(investor.topPercentage)} tone="accent" />
      </section>

      <InvestorPositionsTable rows={rows} />
      <GraphPanel snapshotId={snapshotId} initialCenterId={`investor:${investor.investorId}`} centerOptions={centerOptions} title="Investor-centered relationship map" />
    </div>
  );
}

