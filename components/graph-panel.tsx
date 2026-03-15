"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { NetworkGraph3D } from "@/components/network-graph-3d";
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

type GraphNode3D = {
  id: string;
  label: string;
  type: "issuer" | "investor";
  color: string;
  val: number;
  depth: number;
  x: number;
  y: number;
  z: number;
  fx?: number;
  fy?: number;
  fz?: number;
};

type GraphLink3D = {
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

  const nodes: GraphNode3D[] = [];
  for (const [depth, items] of [...nodesByDepth.entries()].sort((left, right) => left[0] - right[0])) {
    items.sort((left, right) => left.label.localeCompare(right.label));
    items.forEach((node, index) => {
      const radius = depth === 0 ? 0 : depth * 42;
      const theta = depth === 0 ? 0 : (index / items.length) * Math.PI * 2 + depth * 0.35;
      const phi = depth === 0 ? Math.PI / 2 : Math.acos(1 - (2 * (index + 0.5)) / items.length);
      const color = node.type === "issuer" ? "#103b2d" : "#0b6b88";
      nodes.push({
        id: node.id,
        label: node.type === "issuer" && node.shareCode ? `${node.shareCode} - ${node.label}` : node.label,
        type: node.type,
        color,
        val: node.id === centerId ? 7.4 : node.type === "issuer" ? 5.6 : 4.4,
        depth,
        x: radius * Math.sin(phi) * Math.cos(theta),
        y: radius * Math.cos(phi),
        z: radius * Math.sin(phi) * Math.sin(theta),
        fx: radius * Math.sin(phi) * Math.cos(theta),
        fy: radius * Math.cos(phi),
        fz: radius * Math.sin(phi) * Math.sin(theta),
      });
    });
  }

  const links: GraphLink3D[] = expanded.edges.map((edge) => ({
    source: edge.sourceId,
    target: edge.targetId,
    label: `${edge.issuerName} / ${edge.investorName}: ${formatPercentage(edge.percentage)}`,
    color: "rgba(16, 18, 26, 0.24)",
    width: Math.max(0.5, edge.percentage / 8),
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
  const [hopLimit, setHopLimit] = useState(2);
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
    return <div className="panel p-6 text-sm text-ink/55">Loading graph artifact...</div>;
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
    <section className="panel p-6">
      <div className="flex flex-col gap-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-sm uppercase tracking-[0.22em] text-pine/70">3D network graph</p>
            <h2 className="mt-2 text-3xl font-semibold text-ink">{title}</h2>
          </div>
          {computedCenterOption && (
            <Link
              href={computedCenterOption.path}
              className="rounded-full border border-pine/20 bg-pine px-4 py-2 text-sm font-medium text-white"
            >
              Open selected center page
            </Link>
          )}
        </div>

        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
          <label className="text-sm text-ink/65">
            <span className="mb-2 block uppercase tracking-[0.18em] text-ink/45">Center</span>
            <select
              value={centerId}
              onChange={(event) => setCenterId(event.target.value)}
              className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 outline-none"
            >
              {availableCenterOptions.map((option) => (
                <option key={option.nodeId} value={option.nodeId}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-ink/65">
            <span className="mb-2 block uppercase tracking-[0.18em] text-ink/45">Hop depth</span>
            <select
              value={hopLimit}
              onChange={(event) => setHopLimit(Number(event.target.value))}
              className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 outline-none"
            >
              {[1, 2, 3, 4].map((value) => (
                <option key={value} value={value}>
                  {value} hop{value > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>

          <label className="text-sm text-ink/65">
            <span className="mb-2 block uppercase tracking-[0.18em] text-ink/45">Min %</span>
            <input
              type="number"
              min={0}
              max={100}
              step={0.1}
              value={minPercentage}
              onChange={(event) => setMinPercentage(Number(event.target.value))}
              className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 outline-none"
            />
          </label>

          <label className="text-sm text-ink/65">
            <span className="mb-2 block uppercase tracking-[0.18em] text-ink/45">Edges per node</span>
            <input
              type="number"
              min={2}
              max={20}
              step={1}
              value={maxEdgesPerNode}
              onChange={(event) => setMaxEdgesPerNode(Number(event.target.value))}
              className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 outline-none"
            />
          </label>

          <label className="text-sm text-ink/65">
            <span className="mb-2 block uppercase tracking-[0.18em] text-ink/45">Investor type</span>
            <select
              value={investorType}
              onChange={(event) => setInvestorType(event.target.value)}
              className="w-full rounded-2xl border border-ink/10 bg-paper px-4 py-3 outline-none"
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

        <div className="grid gap-4 lg:grid-cols-[1fr_260px]">
          <div className="overflow-hidden rounded-[28px] border border-ink/10 bg-[#f2f7f4]">
            <NetworkGraph3D nodes={nodes} links={links} centerId={centerId} onNodeClick={setCenterId} />
          </div>

          <div className="space-y-4 rounded-[28px] border border-ink/10 bg-paper/70 p-5">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-ink/45">Visible graph</p>
              <p className="mt-2 text-2xl font-semibold text-ink">{expanded.nodes.length} nodes</p>
              <p className="text-sm text-ink/58">{expanded.edges.length} bounded edges</p>
            </div>
            <label className="text-sm text-ink/65">
              <span className="mb-2 block uppercase tracking-[0.18em] text-ink/45">Local / Foreign</span>
              <select
                value={localForeign}
                onChange={(event) => setLocalForeign(event.target.value)}
                className="w-full rounded-2xl border border-ink/10 bg-white px-4 py-3 outline-none"
              >
                <option value="ALL">All holders</option>
                <option value="L">Local</option>
                <option value="A">Foreign</option>
              </select>
            </label>
            <p className="text-sm leading-6 text-ink/58">
              Drag to orbit, scroll to zoom, and click any node to recenter. Expansion is deterministic and capped to
              keep the graph readable.
            </p>
            {expanded.truncated && (
              <div className="rounded-2xl border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
                The graph hit the safety cap. Raise filters or lower hop depth to inspect more precisely.
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
