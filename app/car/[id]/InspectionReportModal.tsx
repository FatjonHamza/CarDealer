"use client";

/**
 * Full inspection-report popup. Surfaces everything in `car.inspection` that
 * the page summary doesn't already show — mirrors what Encar's own
 * `mdsl_regcar.do?method=inspectionViewNew` page renders, but using the cached
 * payload we already have.
 */

import { useEffect, useState } from "react";
import { tt, type Lang } from "../../../src/i18n.js";
import { useSite } from "../../i18n/Provider";
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

function joinTitles(arr: CodeTitle[], lang: Lang): string {
  return arr.map((c) => tt(c.title, undefined, lang)).join(", ");
}

// "OK" statuses are checked against their original Korean values so the
// language toggle doesn't break the green/amber colour-coding.
const OK_STATUS_KO = new Set(["양호", "정상", "없음", "적정", "기본품목", "보유상태"]);

function ItemRow({ item, depth = 0, lang }: { item: InspectionItem; depth?: number; lang: Lang }) {
  const name = tt(item.type.title, undefined, lang);
  const status = item.statusType ? tt(item.statusType.title, undefined, lang) : null;
  const subStatuses = (item.statusItemTypes ?? []).map((s) => tt(s.title, undefined, lang)).join(", ");
  const isFlagged = !!item.statusType && !OK_STATUS_KO.has(item.statusType.title);
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
        <ItemRow key={i} item={c} depth={depth + 1} lang={lang} />
      ))}
    </>
  );
}

function Section({ section, lang }: { section: InspectionSection; lang: Lang }) {
  const children = section.children ?? [];
  if (children.length === 0) return null;
  return (
    <div className="mb-5">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400 mb-2">
        {tt(section.type.title, undefined, lang)}
      </h4>
      <ul className="text-sm">
        {children.map((c, i) => (
          <ItemRow key={i} item={c} lang={lang} />
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
  const { lang, t: dict } = useSite();
  const t = dict.inspectionReport;
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
    { label: t.head.supplyNo, value: m.supplyNum || "—" },
    { label: t.head.registered, value: fmtDate(m.registrationDate) },
  ];
  if (d) {
    headRows.push(
      { label: t.head.issueDate, value: fmtDate(d.issueDate) },
      { label: t.head.validity, value: `${fmtDate(d.validityStartDate)} → ${fmtDate(d.validityEndDate)}` },
      { label: t.head.inspector, value: d.inspName || "—" },
      { label: t.head.noticeDealer, value: d.noticeName || "—" },
      { label: t.head.vin, value: d.vin || "—" },
      { label: t.head.modelYear, value: d.modelYear || "—" },
      { label: t.head.firstRegistration, value: fmtDate(d.firstRegistrationDate) },
      { label: t.head.mileageAtInspection, value: d.mileage != null ? `${d.mileage.toLocaleString(lang)} km` : "—" },
      { label: t.head.motorType, value: d.motorType || "—" },
      { label: t.head.transmission, value: d.transmissionType ? tt(d.transmissionType.title, undefined, lang) : "—" },
      { label: t.head.guaranty, value: d.guarantyType ? tt(d.guarantyType.title, undefined, lang) : "—" },
      { label: t.head.color, value: d.colorType ? tt(d.colorType.title, undefined, lang) : "—" },
      { label: t.head.engineCheck, value: d.engineCheck || "—" },
      { label: t.head.transmissionCheck, value: d.trnsCheck || "—" },
    );
    if (d.boardStateType) headRows.push({ label: t.head.boardState, value: tt(d.boardStateType.title, undefined, lang) });
    if (d.mileageStateType) headRows.push({ label: t.head.mileageState, value: tt(d.mileageStateType.title, undefined, lang) });
    if (d.carStateType) headRows.push({ label: t.head.carState, value: tt(d.carStateType.title, undefined, lang) });
  }

  const flags: { label: string; on: boolean }[] = [
    { label: t.flags.accident, on: m.accdient },
    { label: t.flags.simpleRepair, on: m.simpleRepair },
  ];
  if (d) {
    flags.push(
      { label: t.flags.tuning, on: d.tuning },
      { label: t.flags.waterLog, on: d.waterlog },
      { label: t.flags.recall, on: d.recall },
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="text-sm px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
      >
        {t.openBtn}
      </button>
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={t.title}
        >
          <div
            className="bg-white dark:bg-neutral-950 rounded-xl max-w-3xl w-full max-h-[90vh] overflow-y-auto p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between mb-5 gap-3 pb-3 border-b border-neutral-200 dark:border-neutral-800">
              <div>
                <h2 className="text-lg font-bold">{t.title}</h2>
                <p className="text-xs text-neutral-500 mt-0.5">
                  {t.subtitle}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label={t.closeAria}
                className="text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 text-lg leading-none"
              >
                ✕
              </button>
            </div>

            <div className="mb-5">
              <h3 className="text-sm font-semibold mb-2">{t.sections.header}</h3>
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
              <h3 className="text-sm font-semibold mb-2">{t.sections.statusFlags}</h3>
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
                    <span className="font-mono text-xs">{f.on ? t.flags.yes : t.flags.no}</span>
                  </div>
                ))}
              </div>
            </div>

            {d && (d.tuningStateTypes.length > 0 || d.seriousTypes.length > 0 || d.usageChangeTypes.length > 0 || d.paintPartTypes.length > 0 || d.recallFullFillTypes.length > 0) && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold mb-2">{t.sections.notes}</h3>
                <dl className="text-sm grid gap-1.5">
                  {d.tuningStateTypes.length > 0 && (
                    <div className="flex justify-between gap-3"><dt className="text-neutral-500">{t.notes.tuning}</dt><dd className="text-right">{joinTitles(d.tuningStateTypes, lang)}</dd></div>
                  )}
                  {d.seriousTypes.length > 0 && (
                    <div className="flex justify-between gap-3"><dt className="text-neutral-500">{t.notes.serious}</dt><dd className="text-right">{joinTitles(d.seriousTypes, lang)}</dd></div>
                  )}
                  {d.usageChangeTypes.length > 0 && (
                    <div className="flex justify-between gap-3"><dt className="text-neutral-500">{t.notes.usageChange}</dt><dd className="text-right">{joinTitles(d.usageChangeTypes, lang)}</dd></div>
                  )}
                  {d.paintPartTypes.length > 0 && (
                    <div className="flex justify-between gap-3"><dt className="text-neutral-500">{t.notes.paintParts}</dt><dd className="text-right">{joinTitles(d.paintPartTypes, lang)}</dd></div>
                  )}
                  {d.recallFullFillTypes.length > 0 && (
                    <div className="flex justify-between gap-3"><dt className="text-neutral-500">{t.notes.recall}</dt><dd className="text-right">{joinTitles(d.recallFullFillTypes, lang)}</dd></div>
                  )}
                </dl>
              </div>
            )}

            {inspection.outers.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">{t.sections.outers}</h3>
                {inspection.outers.map((s, i) => <Section key={i} section={s} lang={lang} />)}
              </div>
            )}

            {inspection.inners.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">{t.sections.inners}</h3>
                {inspection.inners.map((s, i) => <Section key={i} section={s} lang={lang} />)}
              </div>
            )}

            {inspection.etcs.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold mb-2">{t.sections.etcs}</h3>
                {inspection.etcs.map((s, i) => <Section key={i} section={s} lang={lang} />)}
              </div>
            )}

            {d?.comments && (
              <div className="mb-5">
                <h3 className="text-sm font-semibold mb-2">{t.sections.commentsKo}</h3>
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
                {t.viewOnEncar}
              </a>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="text-sm px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                {t.closeBtn}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
