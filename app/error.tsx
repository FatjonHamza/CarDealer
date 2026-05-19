"use client";

import { useEffect } from "react";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="max-w-2xl mx-auto py-12 grid gap-4">
      <h1 className="text-xl font-semibold">Something broke</h1>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        {error.message || "An unexpected error occurred."}
      </p>
      {error.digest && (
        <p className="text-xs text-neutral-500 font-mono">
          digest: {error.digest}
        </p>
      )}
      <div className="flex gap-2">
        <button
          onClick={reset}
          className="text-sm px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
        >
          Try again
        </button>
        <a
          href="/"
          className="text-sm px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
        >
          Back to search
        </a>
      </div>
    </div>
  );
}
