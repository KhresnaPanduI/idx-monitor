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
import { motion } from "framer-motion";

import { formatNumber, formatPercentage } from "@/lib/format";
import type { HoldingRow } from "@/lib/types";

const columns: ColumnDef<HoldingRow>[] = [
  {
    accessorKey: "shareCode",
    header: "Share code",
    cell: ({ row, getValue }) => (
      <Link href={`/snapshots/${row.original.snapshotDate}/issuers/${row.original.shareCode}`} className="font-bold text-foreground hover:text-accent transition-colors">
        {String(getValue())}
      </Link>
    ),
  },
  {
    accessorKey: "issuerName",
    header: "Company",
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
    accessorKey: "totalHoldingShares",
    header: "Total shares",
    cell: ({ getValue }) => formatNumber(Number(getValue())),
  },
  {
    accessorKey: "percentage",
    header: "Ownership",
    cell: ({ getValue }) => {
      const val = Number(getValue());
      return (
        <div className="flex items-center gap-3">
          <span className="w-12 font-semibold text-foreground">{formatPercentage(val)}</span>
          <div className="h-2 w-24 rounded-full bg-border/50 overflow-hidden">
            <div className="h-full bg-accent rounded-full transition-all" style={{ width: `${Math.min(100, val)}%` }} />
          </div>
        </div>
      );
    },
  },
];

export function InvestorPositionsTable({ rows }: { rows: HoldingRow[] }) {
  const [query, setQuery] = useState("");
  const [origin, setOrigin] = useState("ALL");

  const filteredRows = rows.filter((row) => {
    if (query && !`${row.shareCode} ${row.issuerName}`.toLowerCase().includes(query.toLowerCase())) return false;
    if (origin !== "ALL" && row.localForeignCode !== origin) return false;
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
    <section className="rounded-3xl border border-border bg-background-alt p-8 shadow-soft lg:p-12">
      <div className="flex flex-col gap-8">
        <div className="flex flex-wrap flex-col lg:flex-row items-start lg:items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent mb-2">Investor positions</p>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">Connected companies in snapshot</h2>
          </div>
          
          <div className="flex flex-wrap items-center gap-3">
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Filter company or stock code..."
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10 min-w-[200px]"
            />
            <select
              value={origin}
              onChange={(event) => setOrigin(event.target.value)}
              className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm outline-none transition-all focus:border-accent focus:ring-2 focus:ring-accent/10"
            >
              <option value="ALL">All origins</option>
              <option value="L">Local</option>
              <option value="A">Foreign</option>
            </select>
            <div className="ml-2 rounded-full bg-border/50 px-3 py-1 text-xs font-semibold text-foreground-muted">
              {filteredRows.length} positions visible
            </div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
          <div className="max-h-[700px] overflow-auto">
            <table className="min-w-full border-collapse text-left">
              <thead className="sticky top-0 z-10 bg-background/95 backdrop-blur text-xs font-semibold uppercase tracking-wider text-foreground-muted border-b border-border">
                {table.getHeaderGroups().map((headerGroup) => (
                  <tr key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <th key={header.id} className="px-5 py-4 font-medium whitespace-nowrap">
                        {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                      </th>
                    ))}
                  </tr>
                ))}
              </thead>
              <tbody className="bg-white">
                {table.getRowModel().rows.map((row, index) => (
                  <motion.tr 
                    key={row.id} 
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: Math.min(index, 20) * 0.03 }}
                    className="border-b border-border text-sm text-foreground hover:bg-background-alt transition-colors"
                  >
                    {row.getVisibleCells().map((cell) => (
                      <td key={cell.id} className="px-5 py-4 align-middle whitespace-nowrap">
                        {cell.column.columnDef.cell
                          ? flexRender(cell.column.columnDef.cell, cell.getContext())
                          : String(cell.getValue() ?? "")}
                      </td>
                    ))}
                  </motion.tr>
                ))}
              </tbody>
            </table>
            {!filteredRows.length && (
               <div className="p-8 text-center text-sm text-foreground-muted uppercase tracking-wide">
                 No matching positions found.
               </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
