import Link from "next/link";

export function SiteHeader() {
  return (
    <header className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-6 sm:px-6 lg:px-8">
      <Link href="/" className="flex items-center gap-3">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-pine text-lg font-bold text-white shadow-lg shadow-pine/20">
          IH
        </div>
        <div>
          <p className="font-display text-2xl leading-none text-pine">IDX Holder Monitor</p>
          <p className="text-sm text-ink/65">Public ownership research for KSEI snapshots</p>
        </div>
      </Link>
      <div className="hidden rounded-full border border-ink/10 bg-white/80 px-4 py-2 text-sm text-ink/70 md:block">
        Multi-hop issuer and investor network explorer
      </div>
    </header>
  );
}
