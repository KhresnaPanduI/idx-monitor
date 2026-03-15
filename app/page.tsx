import { SearchPanel } from "@/components/search-panel";
import { getLatestSnapshotId } from "@/lib/data";

export default async function HomePage() {
  const latestSnapshotId = await getLatestSnapshotId();

  return (
    <div className="max-w-7xl mx-auto pb-10 px-6 lg:px-8">
      <SearchPanel snapshotId={latestSnapshotId} />
    </div>
  );
}
