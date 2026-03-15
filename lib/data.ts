import { cache } from "react";
import { promises as fs } from "fs";
import path from "path";

import type { GraphData, Manifest, SearchIndex, SnapshotData } from "@/lib/types";

const generatedRoot = path.join(process.cwd(), "public", "generated");

async function readJsonFile<T>(filePath: string): Promise<T> {
  const contents = await fs.readFile(filePath, "utf8");
  return JSON.parse(contents) as T;
}

export const getManifest = cache(async (): Promise<Manifest> => {
  return readJsonFile<Manifest>(path.join(generatedRoot, "manifest.json"));
});

export async function getLatestSnapshotId(): Promise<string> {
  const manifest = await getManifest();
  return manifest.latestSnapshotId;
}

export const getSnapshotData = cache(async (snapshotId: string): Promise<SnapshotData> => {
  return readJsonFile<SnapshotData>(
    path.join(generatedRoot, "snapshots", snapshotId, "data.json"),
  );
});

export const getGraphData = cache(async (snapshotId: string): Promise<GraphData> => {
  return readJsonFile<GraphData>(
    path.join(generatedRoot, "snapshots", snapshotId, "graph.json"),
  );
});

export const getSearchIndex = cache(async (snapshotId: string): Promise<SearchIndex> => {
  return readJsonFile<SearchIndex>(
    path.join(generatedRoot, "snapshots", snapshotId, "search-index.json"),
  );
});
