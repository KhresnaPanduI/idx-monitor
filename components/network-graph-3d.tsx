"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef, useState } from "react";
import SpriteText from "three-spritetext";

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const graphRef = useRef<{
    zoomToFit: (durationMs?: number, paddingPx?: number, nodeFilter?: (node: unknown) => boolean) => void;
    getGraphBbox: (nodeFilter?: (node: unknown) => boolean) => { x: [number, number]; y: [number, number]; z: [number, number] } | null;
    cameraPosition: (
      position: { x?: number; y?: number; z?: number },
      lookAt?: { x?: number; y?: number; z?: number },
      durationMs?: number,
    ) => void;
    controls: () => { target?: { set: (x: number, y: number, z: number) => void }; update?: () => void };
  } | null>(null);
  const [size, setSize] = useState({ width: 0, height: 560 });

  useEffect(() => {
    const element = containerRef.current;
    if (!element) return;

    const updateSize = () => {
      setSize({
        width: Math.max(320, Math.round(element.clientWidth)),
        height: Math.max(360, Math.round(element.clientHeight)),
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(element);

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!size.width || !size.height) {
      return;
    }

    const timer = setTimeout(() => {
      const bbox = graphRef.current?.getGraphBbox?.();
      if (!bbox) {
        return;
      }
      const center = {
        x: (bbox.x[0] + bbox.x[1]) / 2,
        y: (bbox.y[0] + bbox.y[1]) / 2,
        z: (bbox.z[0] + bbox.z[1]) / 2,
      };
      const span = Math.max(bbox.x[1] - bbox.x[0], bbox.y[1] - bbox.y[0], bbox.z[1] - bbox.z[0]);
      const cameraDistance = Math.max(220, span * 2.8);
      const controls = graphRef.current?.controls?.();
      controls?.target?.set(center.x, center.y, center.z);
      controls?.update?.();
      graphRef.current?.cameraPosition(
        {
          x: center.x + cameraDistance * 0.45,
          y: center.y + cameraDistance * 0.22,
          z: center.z + cameraDistance,
        },
        center,
        450,
      );
      setTimeout(() => {
        graphRef.current?.zoomToFit?.(250, 90);
      }, 500);
    }, 40);

    return () => clearTimeout(timer);
  }, [centerId, links, nodes, size.height, size.width]);

  return (
    <div ref={containerRef} className="h-[560px] w-full">
      {size.width > 0 && (
        <ForceGraph3D
          ref={graphRef}
          width={size.width}
          height={size.height}
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
          nodeThreeObject={(node: unknown) => {
            const item = node as GraphNode3D;
            const sprite = new SpriteText(item.label);
            sprite.color = item.type === "issuer" ? "#0f2e23" : "#134f63";
            sprite.textHeight = item.id === centerId ? 10 : item.type === "issuer" ? 8 : 6.5;
            sprite.backgroundColor = "rgba(255,255,255,0.82)";
            sprite.padding = 2;
            sprite.borderRadius = 3;
            sprite.position.set(0, item.val * 2.8 + 6, 0);
            return sprite;
          }}
          nodeThreeObjectExtend
          onNodeClick={(node: unknown) => onNodeClick(String((node as GraphNode3D).id))}
          cooldownTicks={0}
          warmupTicks={0}
          enableNodeDrag={false}
        />
      )}
    </div>
  );
}
