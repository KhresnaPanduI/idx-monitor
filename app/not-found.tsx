import Link from "next/link";

export default function NotFound() {
  return (
    <div className="panel mx-auto mt-16 max-w-2xl p-8 text-center">
      <p className="text-sm uppercase tracking-[0.22em] text-pine/70">Not found</p>
      <h1 className="mt-3 text-4xl font-semibold text-ink">That issuer or investor page does not exist.</h1>
      <p className="mt-4 text-ink/65">Try searching from the homepage to jump back into the latest snapshot.</p>
      <Link href="/" className="mt-6 inline-flex rounded-full bg-pine px-5 py-3 text-sm font-medium text-white">
        Back to home
      </Link>
    </div>
  );
}
