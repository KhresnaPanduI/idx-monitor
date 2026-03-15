import Link from "next/link";
import { notFound } from "next/navigation";

import { CompanySwitcher } from "@/components/company-switcher";
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
            <p className="text-sm font-bold text-accent mb-3 uppercase tracking-wide">{issuer.shareCode}</p>
            <h1 className="font-display text-5xl font-bold text-foreground tracking-tight">{issuer.issuerName}</h1>
            <p className="mt-6 max-w-2xl text-lg text-foreground-muted leading-relaxed">
              Disclosed holders above the public reporting threshold in the selected snapshot.
            </p>
          </div>

          <div className="flex w-full max-w-md flex-col gap-4">
            <CompanySwitcher
              snapshotId={snapshotId}
              currentShareCode={issuer.shareCode}
              companies={Object.values(snapshot.issuersByCode)
                .map((company) => ({ shareCode: company.shareCode, issuerName: company.issuerName }))
                .sort((left, right) => left.shareCode.localeCompare(right.shareCode))}
            />

            <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-8 shadow-sm">
              <p className="text-xs font-semibold uppercase tracking-wider text-accent/80 mb-2">Top disclosed holder</p>
              <p className="text-2xl font-bold text-foreground leading-tight">{issuer.topInvestorName}</p>
              <p className="mt-4 text-3xl font-bold text-accent">{formatPercentage(issuer.topInvestorPercentage)}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Snapshot" value={formatSnapshotDate(snapshotId)} tone="marine" />
        <MetricCard label="Known disclosed" value={formatPercentage(issuer.knownDisclosedPercentageSum)} />
        <MetricCard
          label="Est. Public / <1%"
          value={formatPercentage(issuer.estimatedPublicRemainderPercentage)}
          tone="accent"
        />
        <MetricCard label="Known shares" value={formatNumber(issuer.knownDisclosedShares)} />
      </section>

      <HolderTable snapshotId={snapshotId} rows={rows} />
      <GraphPanel
        snapshotId={snapshotId}
        initialCenterId={`issuer:${issuer.shareCode}`}
        centerOptions={centerOptions}
        title="Company-centered relationship map"
      />
    </div>
  );
}
