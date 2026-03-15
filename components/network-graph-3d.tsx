"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";

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
};

type GraphLink3D = {
  source: string;
  target: string;
  label: string;
  color: string;
  width: number;
};

const ForceGraph3D = dynamic(() => import("react-force-graph-3d"), {
  ssr: false,
}) as unknown as React.ComponentType<Record<string, unknown>>;

type NetworkGraph3DProps = {
  nodes: GraphNode3D[];
  links: GraphLink3D[];
  centerId: string;
  onNodeClick: (nodeId: string) => void;
};

export function NetworkGraph3D({ nodes, links, centerId, onNodeClick }: NetworkGraph3DProps) {
  const graphRef = useRef<{
    zoomToFit: (durationMs?: number, paddingPx?: number) => void;
    cameraPosition: (
      position: { x?: number; y?: number; z?: number },
      lookAt?: { x?: number; y?: number; z?: number },
      durationMs?: number,
    ) => void;
  } | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      const centerNode = nodes.find((node) => node.id === centerId);
      if (!centerNode) {
        graphRef.current?.zoomToFit(500, 70);
        return;
      }

      graphRef.current?.cameraPosition(
        { x: centerNode.x * 1.2, y: centerNode.y * 1.2, z: centerNode.z + 180 },
        { x: centerNode.x, y: centerNode.y, z: centerNode.z },
        700,
      );
    }, 120);

    return () => clearTimeout(timer);
  }, [centerId, links, nodes]);

  return (
    <div className="h-[560px] w-full">
      <ForceGraph3D
        ref={graphRef}
        graphData={{ nodes, links }}
        backgroundColor="#f2f7f4"
        nodeLabel={(node: unknown) => {
          const item = node as GraphNode3D;
          return `${item.type.toUpperCase()}: ${item.label}`;
        }}
        linkLabel={(link: unknown) => (link as GraphLink3D).label}
        nodeRelSize={5}
        showNavInfo={false}
        controlType="orbit"
        linkOpacity={0.25}
        linkWidth={(link: unknown) => (link as GraphLink3D).width}
        linkColor={(link: unknown) => (link as GraphLink3D).color}
        nodeResolution={12}
        onNodeClick={(node: unknown) => onNodeClick(String((node as GraphNode3D).id))}
        cooldownTicks={80}
        d3AlphaDecay={0.08}
        enableNodeDrag
      />
    </div>
  );
}
