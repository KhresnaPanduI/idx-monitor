"use client";

import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";
import Link from "next/link";
import { useState } from "react";

import { formatNumber, formatPercentage } from "@/lib/format";
import type { HoldingRow } from "@/lib/types";

type HolderTableProps = {
  snapshotId: string;
  rows: HoldingRow[];
};

const columns: ColumnDef<HoldingRow>[] = [
  {
    accessorKey: "investorName",
    header: "Investor",
    cell: ({ row, getValue }) => (
      <Link
        href={`/snapshots/${row.original.snapshotDate}/investors/${row.original.investorId}`}
        className="font-medium text-pine hover:underline"
      >
        {String(getValue())}
      </Link>
    ),
  },
  {
    accessorKey: "investorTypeLabel",
    header: "Type",
  },
  {
    accessorKey: "localForeignLabel",
    header: "Origin",
  },
  {
    accessorKey: "nationality",
    header: "Nationality",
    cell: ({ getValue }) => String(getValue() || "Unknown"),
  },
  {
    accessorKey: "domicile",
    header: "Domicile",
    cell: ({ getValue }) => String(getValue() || "Unknown"),
  },
  {
    accessorKey: "holdingsScripless",
    header: "Scripless",
    cell: ({ getValue }) => formatNumber(Number(getValue())),
  },
  {
    accessorKey: "holdingsScrip",
    header: "Scrip",
    cell: ({ getValue }) => formatNumber(Number(getValue())),
  },
  {
    accessorKey: "totalHoldingShares",
    header: "Total shares",
    cell: ({ getValue }) => formatNumber(Number(getValue())),
  },
  {
    accessorKey: "percentage",
    header: "Ownership",
    cell: ({ getValue }) => formatPercentage(Number(getValue())),
  },
];

export function HolderTable({ rows }: HolderTableProps) {
  const [query, setQuery] = useState("");
  const [investorType, setInvestorType] = useState("ALL");
  const [localForeign, setLocalForeign] = useState("ALL");

  const filteredRows = rows.filter((row) => {
    if (query && !row.investorName.toLowerCase().includes(query.toLowerCase())) return false;
    if (investorType !== "ALL" && row.investorTypeCode !== investorType) return false;
    if (localForeign !== "ALL" && row.localForeignCode !== localForeign) return false;
    return true;
  });

  const table = useReactTable({
    data: filteredRows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    initialState: {
      sorting: [{ id: "percentage", desc: true }],
    },
  });

  return (
    <section className="panel p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-pine/70">Holder table</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">Disclosed holder scan</h2>
          </div>
          <div className="text-sm text-ink/55">{filteredRows.length} rows visible</div>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Filter investor name..."
            className="rounded-2xl border border-ink/10 bg-paper px-4 py-3 outline-none"
          />
          <select
            value={investorType}
            onChange={(event) => setInvestorType(event.target.value)}
            className="rounded-2xl border border-ink/10 bg-paper px-4 py-3 outline-none"
          >
            <option value="ALL">All investor types</option>
            <option value="ID">Individual</option>
            <option value="CP">Corporate</option>
            <option value="IB">Insurance / Bank / Specific Institution</option>
            <option value="IS">Institutional</option>
            <option value="SC">Securities Company</option>
            <option value="OT">Other</option>
          </select>
          <select
            value={localForeign}
            onChange={(event) => setLocalForeign(event.target.value)}
            className="rounded-2xl border border-ink/10 bg-paper px-4 py-3 outline-none"
          >
            <option value="ALL">All origins</option>
            <option value="L">Local</option>
            <option value="A">Foreign</option>
          </select>
        </div>

        <div className="overflow-hidden rounded-[28px] border border-ink/10">
          <div className="max-h-[700px] overflow-auto">
            <table className="min-w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-pine text-sm text-white">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-4 py-3 font-medium">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white">
                {table.getRowModel().rows.map((row) => (
                  <tr key={row.id} className="border-t border-ink/8 text-sm text-ink/75">
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-4 py-3 align-top">
                        {cell.column.columnDef.cell
                          ? flexRender(cell.column.columnDef.cell, cell.getContext())
                          : String(cell.getValue() ?? "")}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </section>
  );
}
