"use client";

/**
 * Full inspection-report popup. Surfaces everything in `car.inspection` that
 * the page summary doesn't already show — mirrors what Encar's own
 * `mdsl_regcar.do?method=inspectionViewNew` page renders, but using the cached
 * payload we already have.
 */

import { useEffect, useState } from "react";
import { tt } from "../../../src/i18n.js";
import type {
  InspectionRecord,
  InspectionSection,
  InspectionItem,
  CodeTitle,
} from "../../../src/encar/types.js";

function fmtDate(d: string | null | undefined): string {
  if (!d) return "—";
  if (d.length === 8) return `${d.slice(0, 4)}-${d.slice(4, 6)}-${d.slice(6, 8)}`;
  return d.slice(0, 10);
}

function joinTitles(arr: CodeTitle[]): string {
  return arr.map((c) => tt(c.title)).join(", ");
}

function ItemRow({ item, depth = 0 }: { item: InspectionItem; depth?: number }) {
  const name = tt(item.type.title);
  const status = item.statusType ? tt(item.statusType.title) : null;
  const subStatuses = (item.statusItemTypes ?? []).map((s) => tt(s.title)).join(", ");
  const OK_STATUSES = new Set(["Good", "Normal", "None", "Adequate", "Standard item", "On board"]);
  const isFlagged = !!status && !OK_STATUSES.has(status);
  return (
    <>
      <li
        className="flex items-start justify-between gap-3 py-1.5 border-b border-neutral-100 dark:border-neutral-900"
        style={{ paddingLeft: depth * 12 }}
      >
        <span className="text-neutral-700 dark:text-neutral-300 min-w-0">
          {name}
          {item.description && (
            <span className="block text-xs text-neutral-500 mt-0.5">{item.description}</span>
          )}
          {subStatuses && (
            <span className="block text-xs text-neutral-500 mt-0.5">{subStatuses}</span>
          )}
        </span>
        {status && (
          <span
            className={
              isFlagged
                ? "shrink-0 text-amber-700 dark:text-amber-400 font-medium text-sm"
                : "shrink-0 text-emerald-700 dark:text-emerald-400 text-sm"
            }
          >
            {status}
          </span>
        )}
      </li>
      {(item.children ?? []).map((c, i) => (
        <ItemRow key={i} item={c} depth={depth + 1} />
      ))}
    </>
  );
}

function Section({ section }: { section: InspectionSection }) {
  const children = section.children ?? [];
  if (children.length === 0) return null;
  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
        {tt(section.type.title)}
      </h4>
      <ul className="text-sm">
        {children.map((c, i) => (
          <ItemRow key={i} item={c} />
        ))}
      </ul>
    </div>
  );
}

export function InspectionReportModal({
  inspection,
  encarUrl,
}: {
  inspection: InspectionRecord;
  encarUrl: string;
}) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const m = inspection.master;
  const d = m.detail;

  const headRows: { label: string; value: string }[] = [
    { label: "Supply #", value: m.supplyNum || "—" },
    { label: "Registered", value: fmtDate(m.registrationDate) },
  ];
  if (d) {
    headRows.push(
      { label: "Issue date", value: fmtDate(d.issueDate) },
      { label: "Validity", value: `${fmtDate(d.validityStartDate)} → ${fmtDate(d.validityEndDate)}` },
      { label: "Inspector", value: d.inspName || "—" },
      { label: "Notice (dealer)", value: d.noticeName || "—" },
      { label: "VIN", value: d.vin || "—" },
      { label: "Model year", value: d.modelYear || "—" },
      { label: "First registration", value: fmtDate(d.firstRegistrationDate) },
      { label: "Mileage at inspection", value: d.mileage != null ? `${d.mileage.toLocaleString()} km` : "—" },
      { label: "Motor type", value: d.motorType || "—" },
      { label: "Transmission", value: d.transmissionType ? tt(d.transmissionType.title) : "—" },
      { label: "Guaranty", value: d.guarantyType ? tt(d.guarantyType.title) : "—" },
      { label: "Color", value: d.colorType ? tt(d.colorType.title) : "—" },
      { label: "Engine check", value: d.engineCheck || "—" },
      { label: "Transmission check", value: d.trnsCheck || "—" },
    );
    if (d.boardStateType) headRows.push({ label: "Board state", value: tt(d.boardStateType.title) });
    if (d.mileageStateType) headRows.push({ label: "Mileage state", value: tt(d.mileageStateType.title) });
    if (d.carStateType) headRows.push({ label: "Car state", value: tt(d.carStateType.title) });
  }

  const flags: { label: string; on: boolean }[] = [
    { label: "Inspector-flagged accident", on: m.accdient },
    { label: "Simple repair flagged", on: m.simpleRepair },
  ];
  if (d) {
    flags.push(
      { label: "Tuning", on: d.tuning },
      { label: "Water log", on: d.waterlog },
      { label: "Recall", on: d.recall },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
      >
        View full inspection report
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Inspection report"
        >
          <div
            className="bg-white dark:bg-neutral-950 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5 gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <h2 className="text-lg font-bold">Inspection report</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  Dealer-declared inspection. Translated where dictionary entries exist.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="mb-5">
              <h3 className="text-sm font-semibold mb-2">Header</h3>
              <dl className="grid sm:grid-cols-2 gap-x-6 gap-y-1.5 text-sm">
                {headRows.map((r) => (
                  <div key={r.label} className="flex justify-between gap-3 border-b border-neutral-100 dark:border-neutral-900 py-1">
                    <dt className="text-neutral-500">{r.label}</dt>
                    <dd className="text-right text-neutral-900 dark:text-neutral-100 font-mono text-xs">{r.value}</dd>
                  </div>
                ))}
              </dl>
            </div>

            <div className="mb-5">
              <h3 className="text-sm font-semibold mb-2">Status flags</h3>
              <div className="grid sm:grid-cols-2 gap-2 text-sm">
                {flags.map((f) => (
                  <div
                    key={f.label}
                    className={`flex items-center justify-between px-3 py-2 rounded-lg ${
                      f.on
                        ? "bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300"
                        : "bg-neutral-100 dark:bg-neutral-900 text-neutral-700 dark:text-neutral-300"
                    }`}
                  >
                    <span>{f.label}</span>
                    <span className="font-mono text-xs">{f.on ? "YES" : "no"}</span>
                  </div>
                ))}
              </div>
            </div>

            {d && (d.tuningStateTypes.length > 0 || d.seriousTypes.length > 0 || d.usageChangeTypes.length > 0 || d.paintPartTypes.length > 0 || d.recallFullFillTypes.length > 0) && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold mb-2">Notes</h3>
                <dl className="text-sm grid gap-1.5">
                  {d.tuningStateTypes.length > 0 && (
                    <div className="flex justify-between gap-3"><dt className="text-neutral-500">Tuning</dt><dd className="text-right">{joinTitles(d.tuningStateTypes)}</dd></div>
                  )}
                  {d.seriousTypes.length > 0 && (
                    <div className="flex justify-between gap-3"><dt className="text-neutral-500">Serious</dt><dd className="text-right">{joinTitles(d.seriousTypes)}</dd></div>
                  )}
                  {d.usageChangeTypes.length > 0 && (
                    <div className="flex justify-between gap-3"><dt className="text-neutral-500">Usage change</dt><dd className="text-right">{joinTitles(d.usageChangeTypes)}</dd></div>
                  )}
                  {d.paintPartTypes.length > 0 && (
                    <div className="flex justify-between gap-3"><dt className="text-neutral-500">Paint parts</dt><dd className="text-right">{joinTitles(d.paintPartTypes)}</dd></div>
                  )}
                  {d.recallFullFillTypes.length > 0 && (
                    <div className="flex justify-between gap-3"><dt className="text-neutral-500">Recall</dt><dd className="text-right">{joinTitles(d.recallFullFillTypes)}</dd></div>
                  )}
                </dl>
              </div>
            )}

            {inspection.outers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Exterior panels</h3>
                {inspection.outers.map((s, i) => <Section key={i} section={s} />)}
              </div>
            )}

            {inspection.inners.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Mechanical / inner</h3>
                {inspection.inners.map((s, i) => <Section key={i} section={s} />)}
              </div>
            )}

            {inspection.etcs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">Other items</h3>
                {inspection.etcs.map((s, i) => <Section key={i} section={s} />)}
              </div>
            )}

            {d?.comments && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold mb-2">Inspector notes (Korean)</h3>
                <pre className="whitespace-pre-wrap p-3 bg-neutral-50 dark:bg-neutral-900 rounded text-xs">
                  {d.comments}
                </pre>
              </div>
            )}

            <div className="mt-5 pt-4 border-t border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
              <a
                href={encarUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-blue-600 hover:underline"
              >
                View on Encar →
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
