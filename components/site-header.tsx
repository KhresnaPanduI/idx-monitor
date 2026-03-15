import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-6 lg:px-8 py-6">
      <Link href="/" className="flex items-center gap-4">
        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-xl font-bold text-white shadow-md shadow-accent/20">
          IH
        </div>
        <div>
          <p className="font-display text-2xl leading-none text-foreground tracking-tight">IDX Holder Monitor</p>
          <p className="text-sm text-foreground-muted uppercase tracking-wide mt-1">Public ownership research for KSEI snapshots</p>
        </div>
      </Link>
    </header>
  );
}

