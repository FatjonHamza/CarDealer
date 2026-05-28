"use client";

import { useEffect, useState } from "react";

export interface DetailRow {
  label: string;
  value: string;
}

export function VehicleDetailsModal({
  rows,
  encarUrl,
}: {
  rows: DetailRow[];
  encarUrl?: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-blue-600 hover:underline"
      >
        Details
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Vehicle details"
        >
          <div
            className="bg-white dark:bg-neutral-950 rounded-xl max-w-md w-full max-h-[85vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5">
              <h2 className="text-lg font-bold">Vehicle details</h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>
            <dl className="divide-y divide-neutral-100 dark:divide-neutral-900 text-sm">
              {rows.map((r) => (
                <div key={r.label} className="flex justify-between gap-4 py-2.5">
                  <dt className="text-neutral-500">{r.label}</dt>
                  <dd className="text-right text-neutral-900 dark:text-neutral-100">
                    {r.value}
                  </dd>
                </div>
              ))}
            </dl>
            {encarUrl && (
              <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-800">
                <a
                  href={encarUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:underline"
                >
                  View on Encar →
                </a>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
