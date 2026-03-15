import Link from "next/link";
import { notFound } from "next/navigation";

import { GraphPanel } from "@/components/graph-panel";
import { HolderTable } from "@/components/holder-table";
import { MetricCard } from "@/components/metric-card";
import { getSnapshotData } from "@/lib/data";
import { formatNumber, formatPercentage, formatSnapshotDate } from "@/lib/format";

type IssuerPageProps = {
  params: Promise<{ snapshotId: string; shareCode: string }>;
};

export default async function IssuerPage({ params }: IssuerPageProps) {
  const { snapshotId, shareCode } = await params;
  const snapshot = await getSnapshotData(snapshotId);
  const issuer = snapshot.issuersByCode[shareCode];
  const rows = snapshot.issuerHoldings[shareCode];

  if (!issuer || !rows) {
    notFound();
  }

  const centerOptions = [
    {
      nodeId: `issuer:${issuer.shareCode}`,
      label: `${issuer.shareCode} · ${issuer.issuerName}`,
      path: `/snapshots/${snapshotId}/issuers/${issuer.shareCode}`,
    },
    ...rows.map((row) => ({
      nodeId: `investor:${row.investorId}`,
      label: row.investorName,
      path: `/snapshots/${snapshotId}/investors/${row.investorId}`,
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
            <p className="mt-6 text-sm uppercase tracking-[0.22em] text-pine/70">{issuer.shareCode}</p>
            <h1 className="mt-2 text-4xl font-semibold text-ink sm:text-5xl">{issuer.issuerName}</h1>
            <p className="mt-4 max-w-2xl text-lg text-ink/68">
              This page shows disclosed holders above the public reporting threshold in the selected KSEI snapshot.
            </p>
          </div>

          <div className="rounded-[28px] border border-pine/10 bg-pine px-5 py-5 text-white">
            <p className="text-xs uppercase tracking-[0.18em] text-white/70">Top disclosed holder</p>
            <p className="mt-2 max-w-[280px] text-xl font-semibold">{issuer.topInvestorName}</p>
            <p className="mt-2 text-white/70">{formatPercentage(issuer.topInvestorPercentage)}</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Snapshot" value={formatSnapshotDate(snapshotId)} tone="marine" />
        <MetricCard label="Known disclosed" value={formatPercentage(issuer.knownDisclosedPercentageSum)} />
        <MetricCard
          label="Estimated public / <1%"
          value={formatPercentage(issuer.estimatedPublicRemainderPercentage)}
          tone="accent"
        />
        <MetricCard label="Known shares" value={formatNumber(issuer.knownDisclosedShares)} />
      </section>

      <GraphPanel snapshotId={snapshotId} initialCenterId={`issuer:${issuer.shareCode}`} centerOptions={centerOptions} title="Issuer-centered relationship map" />
      <HolderTable snapshotId={snapshotId} rows={rows} />
    </div>
  );
}
