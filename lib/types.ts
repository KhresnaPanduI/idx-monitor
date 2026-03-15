export type SnapshotSummary = {
  id: string;
  date: string;
  rowCount: number;
  issuerCount: number;
  investorCount: number;
  warningCount: number;
};

export type Manifest = {
  generatedAt: string;
  latestSnapshotId: string;
  snapshots: SnapshotSummary[];
};

export type IssuerSummary = {
  shareCode: string;
  issuerName: string;
  holderCount: number;
  knownDisclosedPercentageSum: number;
  estimatedPublicRemainderPercentage: number;
  knownDisclosedShares: number;
  topInvestorName: string;
  topInvestorPercentage: number;
};

export type InvestorSummary = {
  investorId: string;
  investorName: string;
  positionCount: number;
  issuerCount: number;
  topShareCode: string;
  topIssuerName: string;
  topPercentage: number;
};

export type HoldingRow = {
  snapshotDate: string;
  shareCode: string;
  issuerName: string;
  investorName: string;
  investorId: string;
  investorTypeCode: string;
  investorTypeLabel: string;
  localForeignCode: string;
  localForeignLabel: string;
  nationality: string;
  domicile: string;
  holdingsScripless: number;
  holdingsScrip: number;
  totalHoldingShares: number;
  percentage: number;
};

export type SnapshotData = {
  snapshot: SnapshotSummary;
  issuersByCode: Record<string, IssuerSummary>;
  investorsById: Record<string, InvestorSummary>;
  issuerHoldings: Record<string, HoldingRow[]>;
  investorPositions: Record<string, HoldingRow[]>;
  warnings: string[];
};

export type SearchEntry = {
  type: "issuer" | "investor";
  id: string;
  title: string;
  subtitle: string;
  description: string;
  path: string;
  terms: string[];
};

export type SearchIndex = {
  entries: SearchEntry[];
};

export type GraphNode = {
  id: string;
  entityId: string;
  type: "issuer" | "investor";
  label: string;
  shareCode?: string;
  holderCount?: number;
  knownDisclosedPercentageSum?: number;
  positionCount?: number;
};

export type GraphEdge = {
  targetId: string;
  counterpartName: string;
  counterpartType: "issuer" | "investor";
  shareCode: string;
  issuerName: string;
  investorId: string;
  investorName: string;
  investorTypeCode: string;
  investorTypeLabel: string;
  localForeignCode: string;
  localForeignLabel: string;
  totalHoldingShares: number;
  percentage: number;
};

export type GraphSettings = {
  defaultHopLimit: number;
  maxHopLimit: number;
  defaultMinPercentage: number;
  defaultMaxEdgesPerNode: number;
  maxNodes: number;
  maxEdges: number;
};

export type GraphData = {
  snapshotId: string;
  settings: GraphSettings;
  nodes: Record<string, GraphNode>;
  adjacency: Record<string, GraphEdge[]>;
};

export type ExpandedGraph = {
  nodes: GraphNode[];
  edges: Array<GraphEdge & { sourceId: string; targetId: string; depth: number }>;
  truncated: boolean;
};
