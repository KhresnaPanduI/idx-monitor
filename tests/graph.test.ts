import { describe, expect, it } from "vitest";

import { expandGraph } from "@/lib/graph";
import type { GraphData } from "@/lib/types";

const graph: GraphData = {
  snapshotId: "2026-02-27",
  settings: {
    defaultHopLimit: 2,
    maxHopLimit: 4,
    defaultMinPercentage: 1,
    defaultMaxEdgesPerNode: 12,
    maxNodes: 20,
    maxEdges: 20,
  },
  nodes: {
    "issuer:AADI": { id: "issuer:AADI", entityId: "AADI", type: "issuer", label: "AADI", shareCode: "AADI" },
    "investor:i1": { id: "investor:i1", entityId: "i1", type: "investor", label: "Investor 1" },
    "issuer:GOTO": { id: "issuer:GOTO", entityId: "GOTO", type: "issuer", label: "GOTO", shareCode: "GOTO" },
  },
  adjacency: {
    "issuer:AADI": [
      {
        targetId: "investor:i1",
        counterpartName: "Investor 1",
        counterpartType: "investor",
        shareCode: "AADI",
        issuerName: "AADI",
        investorId: "i1",
        investorName: "Investor 1",
        investorTypeCode: "CP",
        investorTypeLabel: "Corporate",
        localForeignCode: "L",
        localForeignLabel: "Local",
        totalHoldingShares: 10,
        percentage: 6,
      },
    ],
    "investor:i1": [
      {
        targetId: "issuer:AADI",
        counterpartName: "AADI",
        counterpartType: "issuer",
        shareCode: "AADI",
        issuerName: "AADI",
        investorId: "i1",
        investorName: "Investor 1",
        investorTypeCode: "CP",
        investorTypeLabel: "Corporate",
        localForeignCode: "L",
        localForeignLabel: "Local",
        totalHoldingShares: 10,
        percentage: 6,
      },
      {
        targetId: "issuer:GOTO",
        counterpartName: "GOTO",
        counterpartType: "issuer",
        shareCode: "GOTO",
        issuerName: "GOTO",
        investorId: "i1",
        investorName: "Investor 1",
        investorTypeCode: "CP",
        investorTypeLabel: "Corporate",
        localForeignCode: "L",
        localForeignLabel: "Local",
        totalHoldingShares: 8,
        percentage: 4.5,
      },
    ],
    "issuer:GOTO": [
      {
        targetId: "investor:i1",
        counterpartName: "Investor 1",
        counterpartType: "investor",
        shareCode: "GOTO",
        issuerName: "GOTO",
        investorId: "i1",
        investorName: "Investor 1",
        investorTypeCode: "CP",
        investorTypeLabel: "Corporate",
        localForeignCode: "L",
        localForeignLabel: "Local",
        totalHoldingShares: 8,
        percentage: 4.5,
      },
    ],
  },
};

describe("expandGraph", () => {
  it("expands to more than one hop without duplicating edges", () => {
    const expanded = expandGraph(graph, "issuer:AADI", 2, {
      minPercentage: 1,
      maxEdgesPerNode: 12,
      investorType: "ALL",
      localForeign: "ALL",
    });

    expect(expanded.nodes.map((node) => node.id).sort()).toEqual(["investor:i1", "issuer:AADI", "issuer:GOTO"]);
    expect(expanded.edges).toHaveLength(2);
  });
});
