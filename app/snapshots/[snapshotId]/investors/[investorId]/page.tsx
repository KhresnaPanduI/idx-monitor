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
      <section className="panel overflow-hidden p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-6">
          <div className="max-w-3xl">
            <div className="flex flex-wrap items-center gap-3 text-sm text-ink/55">
              <Link href="/" className="hover:text-pine">
                Home
              </Link>
              <span>/</span>
              <span>{formatSnapshotDate(snapshotId)}</span>
            </div>
            <p className="mt-6 text-sm uppercase tracking-[0.22em] text-marine/70">Investor</p>
            <h1 className="mt-2 text-4xl font-semibold text-ink sm:text-5xl">{investor.investorName}</h1>
            <p className="mt-4 max-w-2xl text-lg text-ink/68">
              Review all disclosed issuer positions connected to this investor in the selected snapshot.
            </p>
          </div>

          <div className="rounded-[28px] border border-marine/10 bg-marine px-5 py-5 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">Largest visible position</p>
            <p className="mt-2 max-w-[280px] text-xl font-semibold">
              {investor.topShareCode} · {investor.topIssuerName}
            </p>
            <p className="mt-2 text-white/70">{formatPercentage(investor.topPercentage)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Snapshot" value={formatSnapshotDate(snapshotId)} tone="marine" />
        <MetricCard label="Positions" value={String(investor.positionCount)} />
        <MetricCard label="Issuers" value={String(investor.issuerCount)} />
        <MetricCard label="Top ownership" value={formatPercentage(investor.topPercentage)} tone="accent" />
      </section>

      <GraphPanel snapshotId={snapshotId} initialCenterId={`investor:${investor.investorId}`} centerOptions={centerOptions} title="Investor-centered relationship map" />
      <InvestorPositionsTable rows={rows} />
    </div>
  );
}
