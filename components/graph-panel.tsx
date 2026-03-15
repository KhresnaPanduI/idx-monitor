"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { NetworkGraph2D } from "@/components/network-graph-2d";
import { expandGraph, type GraphFilters } from "@/lib/graph";
import { formatPercentage } from "@/lib/format";
import type { GraphData, GraphNode } from "@/lib/types";

type CenterOption = {
  nodeId: string;
  label: string;
  path: string;
};

type GraphPanelProps = {
  snapshotId: string;
  initialCenterId: string;
  centerOptions: CenterOption[];
  title: string;
};

type GraphNode2D = {
  id: string;
  label: string;
  type: "issuer" | "investor";
  color: string;
  radius: number;
  depth: number;
  x: number;
  y: number;
};

type GraphLink2D = {
  source: string;
  target: string;
  label: string;
  color: string;
  width: number;
};

function buildVisualGraph(data: GraphData, centerId: string, filters: GraphFilters, hopLimit: number) {
  const expanded = expandGraph(data, centerId, hopLimit, filters);
  const depthMap = new Map<string, number>([[centerId, 0]]);

  for (const edge of expanded.edges) {
    const previous = depthMap.get(edge.targetId);
    if (previous === undefined || edge.depth < previous) {
      depthMap.set(edge.targetId, edge.depth);
    }
  }

  const nodesByDepth = new Map<number, GraphNode[]>();
  for (const node of expanded.nodes) {
    const depth = depthMap.get(node.id) ?? 0;
    const group = nodesByDepth.get(depth) ?? [];
    group.push(node);
    nodesByDepth.set(depth, group);
  }

  const nodes: GraphNode2D[] = [];
  for (const [depth, items] of [...nodesByDepth.entries()].sort((left, right) => left[0] - right[0])) {
    items.sort((left, right) => left.label.localeCompare(right.label));
    items.forEach((node, index) => {
      const radius =
        depth === 0
          ? 0
          : depth === 1
            ? 160 + Math.max(0, items.length - 10) * 8
            : depth * Math.max(196, Math.sqrt(items.length) * 54);
      const theta = depth === 0 ? 0 : (index / items.length) * Math.PI * 2 - Math.PI / 2 + depth * 0.18;
      const x = radius * Math.cos(theta);
      const y = radius * Math.sin(theta);
      const color = node.type === "issuer" ? "#4f46e5" : "#64748b"; // FinTech: Indigo Accent vs Slate
      nodes.push({
        id: node.id,
        label: node.type === "issuer" && node.shareCode ? `${node.shareCode} - ${node.label}` : node.label,
        type: node.type,
        color,
        radius: node.id === centerId ? 18 : node.type === "issuer" ? 14 : 11,
        depth,
        x,
        y,
      });
    });
  }

  const links: GraphLink2D[] = expanded.edges.map((edge) => ({
    source: edge.sourceId,
    target: edge.targetId,
    label: `${edge.issuerName} / ${edge.investorName}: ${formatPercentage(edge.percentage)}`,
    color: "rgba(79, 70, 229, 0.22)", // Keep links readable regardless of holding size
    width: 1.5,
  }));

  return { nodes, links, expanded };
}

function fallbackCenterOption(snapshotId: string, node: GraphNode): CenterOption {
  if (node.type === "issuer") {
    return {
      nodeId: node.id,
      label: node.shareCode ? `${node.shareCode} - ${node.label}` : node.label,
      path: `/snapshots/${snapshotId}/issuers/${node.entityId}`,
    };
  }

  return {
    nodeId: node.id,
    label: node.label,
    path: `/snapshots/${snapshotId}/investors/${node.entityId}`,
  };
}

export function GraphPanel({ snapshotId, initialCenterId, centerOptions, title }: GraphPanelProps) {
  const [graphData, setGraphData] = useState<GraphData | null>(null);
  const [centerId, setCenterId] = useState(initialCenterId);
  const [hopLimit, setHopLimit] = useState(1);
  const [minPercentage, setMinPercentage] = useState(1);
  const [maxEdgesPerNode, setMaxEdgesPerNode] = useState(12);
  const [investorType, setInvestorType] = useState("ALL");
  const [localForeign, setLocalForeign] = useState("ALL");

  useEffect(() => {
    let ignore = false;

    async function load() {
      const response = await fetch(`/generated/snapshots/${snapshotId}/graph.json`);
      const payload = (await response.json()) as GraphData;
      if (!ignore) {
        setGraphData(payload);
        setHopLimit(payload.settings.defaultHopLimit);
        setMinPercentage(payload.settings.defaultMinPercentage);
        setMaxEdgesPerNode(payload.settings.defaultMaxEdgesPerNode);
      }
    }

    void load();
    return () => {
      ignore = true;
    };
  }, [snapshotId]);

  if (!graphData) {
    return <div className="rounded-3xl border border-border bg-background-alt p-8 lg:p-12 text-sm text-foreground-muted font-medium">Loading graph artifact...</div>;
  }

  const filters: GraphFilters = {
    minPercentage,
    maxEdgesPerNode,
    investorType,
    localForeign,
  };
  const { nodes, links, expanded } = buildVisualGraph(graphData, centerId, filters, hopLimit);
  const computedCenterOption =
    centerOptions.find((option) => option.nodeId === centerId) ??
    (graphData.nodes[centerId] ? fallbackCenterOption(snapshotId, graphData.nodes[centerId]) : undefined);
  const availableCenterOptions = computedCenterOption
    ? [
        computedCenterOption,
        ...centerOptions.filter((option) => option.nodeId !== computedCenterOption.nodeId),
      ]
    : centerOptions;

  return (
    <section className="rounded-3xl border border-border bg-background-alt p-8 shadow-soft lg:p-12">
      <div className="flex flex-col gap-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <p className="text-sm font-semibold uppercase tracking-wide text-accent mb-2">2D network graph</p>
            <h2 className="text-3xl font-bold text-foreground tracking-tight">{title}</h2>
          </div>
          {computedCenterOption && (
            <Link
              href={computedCenterOption.path}
              className="rounded-xl bg-foreground px-6 py-2.5 text-sm font-medium text-background transition-colors hover:bg-foreground/90 shadow-sm shadow-foreground/10"
            >
              Open selected center page
            </Link>
          )}
        </div>

        <div className="grid gap-3 lg:grid-cols-5">
          <label className="text-sm">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground-muted">Center</span>
            <select
              value={centerId}
              onChange={(event) => setCenterId(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
            >
              {availableCenterOptions.map((option) => (
                <option key={option.nodeId} value={option.nodeId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground-muted">Hop depth</span>
            <select
              value={hopLimit}
              onChange={(event) => setHopLimit(Number(event.target.value))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
            >
              {[1, 2, 3, 4].map((value) => (
                <option key={value} value={value}>
                  {value} hop{value > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground-muted">Min %</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={minPercentage}
              onChange={(event) => setMinPercentage(Number(event.target.value))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
            />
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground-muted">Edges per node</span>
            <input
              type="number"
              min={2}
              max={20}
              step={1}
              value={maxEdgesPerNode}
              onChange={(event) => setMaxEdgesPerNode(Number(event.target.value))}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
            />
          </label>

          <label className="text-sm">
            <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground-muted">Investor type</span>
            <select
              value={investorType}
              onChange={(event) => setInvestorType(event.target.value)}
              className="w-full rounded-xl border border-border bg-background px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all"
            >
              <option value="ALL">All types</option>
              <option value="ID">Individual</option>
              <option value="CP">Corporate</option>
              <option value="IB">Insurance / Bank / Specific Institution</option>
              <option value="IS">Institutional</option>
              <option value="SC">Securities Company</option>
              <option value="OT">Other</option>
            </select>
          </label>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1fr_300px]">
          <div className="overflow-hidden rounded-2xl border border-border bg-background min-h-[500px] shadow-inner">
            <NetworkGraph2D nodes={nodes} links={links} centerId={centerId} onNodeClick={setCenterId} />
          </div>

          <div className="space-y-8 rounded-2xl border border-indigo-100 bg-indigo-50/50 p-6 lg:p-8 flex flex-col justify-between shadow-sm">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-accent/80 mb-2">Visible graph</p>
              <p className="text-4xl font-bold text-foreground tracking-tight leading-none">{expanded.nodes.length}</p>
              <p className="text-xs font-medium text-foreground-muted block mt-1">Nodes</p>
              
              <div className="h-px w-full bg-border/50 my-6"></div>

              <p className="text-4xl font-bold text-foreground tracking-tight leading-none">{expanded.edges.length}</p>
              <p className="text-xs font-medium text-foreground-muted block mt-1">Bounded edges</p>
            </div>
            
            <label className="text-sm block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wider text-foreground-muted">Local / Foreign</span>
              <select
                value={localForeign}
                onChange={(event) => setLocalForeign(event.target.value)}
                className="w-full rounded-xl border border-border bg-white px-4 py-3 outline-none focus:border-accent focus:ring-2 focus:ring-accent/10 transition-all text-sm shadow-sm"
              >
                <option value="ALL">All holders</option>
                <option value="L">Local</option>
                <option value="A">Foreign</option>
              </select>
            </label>

            <p className="text-sm leading-relaxed text-foreground-muted">
              Scroll to zoom, drag to pan, and click any node or label to recenter. The 2D layout uses concentric
              rings by hop depth and keeps labels outside the nodes for easier scanning.
            </p>

            {expanded.truncated && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 shadow-sm">
                <p className="font-semibold text-amber-700 mb-1">Cap reached</p>
                The graph hit the safety cap. Raise filters or lower hop depth to inspect more precisely.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
