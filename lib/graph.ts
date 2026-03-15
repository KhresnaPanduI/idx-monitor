import type { ExpandedGraph, GraphData, GraphEdge, GraphNode } from "@/lib/types";

export type GraphFilters = {
  minPercentage: number;
  maxEdgesPerNode: number;
  investorType: string;
  localForeign: string;
};

function includeEdge(edge: GraphEdge, filters: GraphFilters): boolean {
  if (edge.percentage < filters.minPercentage) return false;
  if (filters.investorType !== "ALL" && edge.investorTypeCode !== filters.investorType) {
    return false;
  }
  if (filters.localForeign !== "ALL" && edge.localForeignCode !== filters.localForeign) {
    return false;
  }
  return true;
}

export function expandGraph(
  graph: GraphData,
  centerId: string,
  hopLimit: number,
  filters: GraphFilters,
): ExpandedGraph {
  const maxNodes = graph.settings.maxNodes;
  const maxEdges = graph.settings.maxEdges;
  const visited = new Set<string>([centerId]);
  const nodes: GraphNode[] = [];
  const edges: ExpandedGraph["edges"] = [];
  const seenPairs = new Set<string>();
  let truncated = false;

  const queue: Array<{ id: string; depth: number }> = [{ id: centerId, depth: 0 }];

  while (queue.length > 0) {
    const current = queue.shift();
    if (!current) continue;

    const currentNode = graph.nodes[current.id];
    if (!currentNode) continue;

    if (!nodes.some((node) => node.id === current.id)) {
      nodes.push(currentNode);
    }

    if (current.depth >= hopLimit) {
      continue;
    }

    const candidateEdges = (graph.adjacency[current.id] ?? [])
      .filter((edge) => includeEdge(edge, filters))
      .slice(0, filters.maxEdgesPerNode);

    for (const edge of candidateEdges) {
      if (edges.length >= maxEdges) {
        truncated = true;
        break;
      }

      const pairKey = [current.id, edge.targetId].sort().join("::");
      if (seenPairs.has(pairKey)) {
        continue;
      }
      seenPairs.add(pairKey);

      edges.push({
        ...edge,
        sourceId: current.id,
        targetId: edge.targetId,
        depth: current.depth + 1,
      });

      if (!visited.has(edge.targetId)) {
        visited.add(edge.targetId);
        if (visited.size > maxNodes) {
          truncated = true;
          break;
        }
        queue.push({ id: edge.targetId, depth: current.depth + 1 });
      }
    }

    if (truncated) {
      break;
    }
  }

  for (const nodeId of visited) {
    const node = graph.nodes[nodeId];
    if (node && !nodes.some((existing) => existing.id === node.id)) {
      nodes.push(node);
    }
  }

  return { nodes, edges, truncated };
}
