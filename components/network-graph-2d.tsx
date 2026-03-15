"use client";

import type { PointerEvent as ReactPointerEvent, WheelEvent as ReactWheelEvent } from "react";
import { useEffect, useMemo, useRef, useState } from "react";

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

type NetworkGraph2DProps = {
  nodes: GraphNode2D[];
  links: GraphLink2D[];
  centerId: string;
  onNodeClick: (nodeId: string) => void;
};

type LabelDatum = {
  nodeId: string;
  fullText: string;
  shortText: string;
  side: "left" | "right" | "center";
  fontSize: number;
  width: number;
  height: number;
  desiredX: number;
  desiredY: number;
  x: number;
  y: number;
};

const SVG_WIDTH = 860;
const SVG_HEIGHT = 560;
const PADDING = 30;
const MIN_ZOOM_RATIO = 0.35;
const MAX_ZOOM_RATIO = 2.8;

type ViewBox = {
  minX: number;
  minY: number;
  width: number;
  height: number;
};

function truncateLabel(label: string, maxLength: number) {
  if (label.length <= maxLength) {
    return label;
  }

  return `${label.slice(0, maxLength - 1).trimEnd()}…`;
}

function estimateTextWidth(text: string, fontSize: number) {
  return Math.ceil(text.length * fontSize * 0.56);
}

function buildLabelLayout(nodes: GraphNode2D[], centerId: string) {
  const labels = new Map<string, LabelDatum>();

  for (const node of nodes) {
    const isCenter = node.id === centerId;
    const fontSize = isCenter ? 16 : node.type === "issuer" ? 12 : 11;
    const shortText = truncateLabel(node.label, isCenter ? 42 : node.depth === 1 ? 30 : 22);
    const width = estimateTextWidth(shortText, fontSize) + 14;
    const height = fontSize + 10;

    if (isCenter) {
      labels.set(node.id, {
        nodeId: node.id,
        fullText: node.label,
        shortText,
        side: "center",
        fontSize,
        width,
        height,
        desiredX: node.x - width / 2,
        desiredY: node.y - node.radius - height - 18,
        x: node.x - width / 2,
        y: node.y - node.radius - height - 18,
      });
      continue;
    }

    const side = node.x >= 0 ? "right" : "left";
    const labelGap = node.radius + 18;
    const desiredX = side === "right" ? node.x + labelGap : node.x - labelGap - width;
    const desiredY = node.y - height / 2;

    labels.set(node.id, {
      nodeId: node.id,
      fullText: node.label,
      shortText,
      side,
      fontSize,
      width,
      height,
      desiredX,
      desiredY,
      x: desiredX,
      y: desiredY,
    });
  }

  for (const side of ["left", "right"] as const) {
    const sideLabels = [...labels.values()]
      .filter((label) => label.side === side)
      .sort((left, right) => left.desiredY - right.desiredY);

    if (sideLabels.length === 0) {
      continue;
    }

    const gap = 8;
    let cursor = sideLabels[0].desiredY;
    for (const label of sideLabels) {
      label.y = Math.max(label.desiredY, cursor);
      cursor = label.y + label.height + gap;
    }

    const firstTop = sideLabels[0].y;
    const lastBottom = sideLabels.at(-1)!.y + sideLabels.at(-1)!.height;
    const desiredTop = sideLabels[0].desiredY;
    const desiredBottom = sideLabels.at(-1)!.desiredY + sideLabels.at(-1)!.height;
    const desiredCenter = (desiredTop + desiredBottom) / 2;
    const actualCenter = (firstTop + lastBottom) / 2;
    const shift = desiredCenter - actualCenter;

    for (const label of sideLabels) {
      label.y += shift;
    }
  }

  return labels;
}

function computeViewBox(nodes: GraphNode2D[], labels: Map<string, LabelDatum>) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;

  for (const node of nodes) {
    minX = Math.min(minX, node.x - node.radius);
    minY = Math.min(minY, node.y - node.radius);
    maxX = Math.max(maxX, node.x + node.radius);
    maxY = Math.max(maxY, node.y + node.radius);
  }

  for (const label of labels.values()) {
    minX = Math.min(minX, label.x);
    minY = Math.min(minY, label.y);
    maxX = Math.max(maxX, label.x + label.width);
    maxY = Math.max(maxY, label.y + label.height);
  }

  return {
    minX: minX - PADDING,
    minY: minY - PADDING,
    width: maxX - minX + PADDING * 2,
    height: maxY - minY + PADDING * 2,
  };
}

function buildRingGuides(nodes: GraphNode2D[]) {
  const radii = [...new Set(nodes.filter((node) => node.depth > 0).map((node) => Math.hypot(node.x, node.y)))]
    .sort((left, right) => left - right)
    .filter((radius, index, items) => index === 0 || Math.abs(radius - items[index - 1]) > 8);

  return radii.map((radius) => ({
    radius,
    label: `${Math.round(radius)}`,
  }));
}

export function NetworkGraph2D({ nodes, links, centerId, onNodeClick }: NetworkGraph2DProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const dragStateRef = useRef<{
    pointerId: number;
    clientX: number;
    clientY: number;
  } | null>(null);
  const suppressClickRef = useRef(false);
  const { nodeMap, labels, viewBox, ringGuides } = useMemo(() => {
    const nextNodeMap = new Map(nodes.map((node) => [node.id, node]));
    const nextLabels = buildLabelLayout(nodes, centerId);
    return {
      nodeMap: nextNodeMap,
      labels: nextLabels,
      viewBox: computeViewBox(nodes, nextLabels),
      ringGuides: buildRingGuides(nodes),
    };
  }, [centerId, nodes]);
  const [activeViewBox, setActiveViewBox] = useState(viewBox);

  useEffect(() => {
    setActiveViewBox(viewBox);
    suppressClickRef.current = false;
  }, [viewBox]);

  function clampViewBox(next: ViewBox) {
    const minWidth = viewBox.width * MIN_ZOOM_RATIO;
    const maxWidth = viewBox.width * MAX_ZOOM_RATIO;
    const minHeight = viewBox.height * MIN_ZOOM_RATIO;
    const maxHeight = viewBox.height * MAX_ZOOM_RATIO;

    return {
      minX: next.minX,
      minY: next.minY,
      width: Math.min(maxWidth, Math.max(minWidth, next.width)),
      height: Math.min(maxHeight, Math.max(minHeight, next.height)),
    };
  }

  function toSvgPoint(clientX: number, clientY: number) {
    const svg = svgRef.current;
    if (!svg) {
      return null;
    }

    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return null;
    }

    return {
      x: activeViewBox.minX + ((clientX - rect.left) / rect.width) * activeViewBox.width,
      y: activeViewBox.minY + ((clientY - rect.top) / rect.height) * activeViewBox.height,
      rect,
    };
  }

  function handleWheel(event: ReactWheelEvent<SVGSVGElement>) {
    event.preventDefault();

    const point = toSvgPoint(event.clientX, event.clientY);
    if (!point) {
      return;
    }

    const zoomFactor = event.deltaY > 0 ? 1.12 : 0.88;
    const nextWidth = activeViewBox.width * zoomFactor;
    const nextHeight = activeViewBox.height * zoomFactor;
    const ratioX = (point.x - activeViewBox.minX) / activeViewBox.width;
    const ratioY = (point.y - activeViewBox.minY) / activeViewBox.height;
    const clamped = clampViewBox({
      minX: point.x - nextWidth * ratioX,
      minY: point.y - nextHeight * ratioY,
      width: nextWidth,
      height: nextHeight,
    });

    setActiveViewBox(clamped);
  }

  function handlePointerDown(event: ReactPointerEvent<SVGSVGElement>) {
    dragStateRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(event: ReactPointerEvent<SVGSVGElement>) {
    const dragState = dragStateRef.current;
    const svg = svgRef.current;
    if (!dragState || !svg || dragState.pointerId !== event.pointerId) {
      return;
    }

    const rect = svg.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) {
      return;
    }

    const deltaX = event.clientX - dragState.clientX;
    const deltaY = event.clientY - dragState.clientY;

    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
      suppressClickRef.current = true;
    }

    setActiveViewBox((current) => ({
      ...current,
      minX: current.minX - (deltaX / rect.width) * current.width,
      minY: current.minY - (deltaY / rect.height) * current.height,
    }));

    dragStateRef.current = {
      pointerId: event.pointerId,
      clientX: event.clientX,
      clientY: event.clientY,
    };
  }

  function handlePointerUp(event: ReactPointerEvent<SVGSVGElement>) {
    if (dragStateRef.current?.pointerId === event.pointerId) {
      dragStateRef.current = null;
      event.currentTarget.releasePointerCapture(event.pointerId);
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }
  }

  function handleNodeClick(nodeId: string) {
    if (suppressClickRef.current) {
      return;
    }

    onNodeClick(nodeId);
  }

  return (
    <div className="h-[560px] w-full">
      <svg
        ref={svgRef}
        viewBox={`${activeViewBox.minX} ${activeViewBox.minY} ${activeViewBox.width} ${activeViewBox.height}`}
        className="h-full w-full"
        role="img"
        aria-label="Ownership network graph"
        preserveAspectRatio="xMidYMid meet"
        onWheel={handleWheel}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
      >
        <rect x={viewBox.minX} y={viewBox.minY} width={viewBox.width} height={viewBox.height} fill="#f2f7f4" />

        {ringGuides.map((guide) => (
          <circle
            key={guide.label}
            cx={0}
            cy={0}
            r={guide.radius}
            fill="none"
            stroke="rgba(16, 59, 45, 0.08)"
            strokeDasharray="6 10"
          />
        ))}

        {links.map((link, index) => {
          const source = nodeMap.get(link.source);
          const target = nodeMap.get(link.target);
          if (!source || !target) {
            return null;
          }

          return (
            <line
              key={`${link.source}-${link.target}-${index}`}
              x1={source.x}
              y1={source.y}
              x2={target.x}
              y2={target.y}
              stroke={link.color}
              strokeWidth={link.width}
              strokeLinecap="round"
            >
              <title>{link.label}</title>
            </line>
          );
        })}

        {nodes.map((node) => {
          const label = labels.get(node.id);
          if (!label) {
            return null;
          }

          const anchorX =
            label.side === "right"
              ? label.x
              : label.side === "left"
                ? label.x + label.width
                : label.x + label.width / 2;
          const anchorY = label.y + label.height / 2;
          const nodeEdgeX =
            label.side === "center"
              ? node.x
              : node.x + Math.sign(anchorX - node.x) * (node.radius + 2);
          const nodeEdgeY =
            label.side === "center"
              ? node.y - node.radius - 2
              : node.y + ((anchorY - node.y) / Math.max(1, Math.hypot(anchorX - node.x, anchorY - node.y))) * node.radius;

          return (
            <g key={node.id}>
              <line
                x1={nodeEdgeX}
                y1={nodeEdgeY}
                x2={anchorX}
                y2={anchorY}
                stroke="rgba(16, 18, 26, 0.16)"
                strokeWidth={1}
              />
              <g
                onClick={() => handleNodeClick(node.id)}
                className="cursor-pointer"
                role="button"
                tabIndex={0}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    handleNodeClick(node.id);
                  }
                }}
              >
                <rect
                  x={label.x}
                  y={label.y}
                  width={label.width}
                  height={label.height}
                  rx={label.height / 2}
                  fill="rgba(255,255,255,0.9)"
                  stroke={node.id === centerId ? "rgba(16, 59, 45, 0.18)" : "rgba(16, 18, 26, 0.08)"}
                />
                <text
                  x={label.side === "left" ? label.x + label.width - 8 : label.side === "right" ? label.x + 8 : label.x + label.width / 2}
                  y={label.y + label.height / 2 + label.fontSize * 0.34}
                  fontSize={label.fontSize}
                  textAnchor={label.side === "left" ? "end" : label.side === "right" ? "start" : "middle"}
                  fill={node.type === "issuer" ? "#163429" : "#335f70"}
                  style={{ fontFamily: "var(--font-source-serif-4), Georgia, serif" }}
                >
                  {label.shortText}
                </text>
                <title>{label.fullText}</title>
              </g>
              <circle
                cx={node.x}
                cy={node.y}
                r={node.radius}
                fill={node.color}
                opacity={0.82}
                stroke={node.id === centerId ? "#0c2f23" : "rgba(255,255,255,0.92)"}
                strokeWidth={node.id === centerId ? 2.5 : 2}
                onClick={() => handleNodeClick(node.id)}
                className="cursor-pointer"
              >
                <title>{node.label}</title>
              </circle>
            </g>
          );
        })}
      </svg>
    </div>
  );
}
