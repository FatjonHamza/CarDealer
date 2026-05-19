import Link from "next/link";

export default function NotFound() {
  return (
    <div className="max-w-2xl mx-auto py-12 grid gap-3">
      <h1 className="text-xl font-semibold">Not found</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        That car isn&apos;t in the local DB. It may have been delisted, or never ingested.
      </p>
      <div>
        <Link
          href="/"
          className="text-sm text-blue-600 hover:underline"
        >
          ← Back to search
        </Link>
      </div>
    </div>
  );
}
