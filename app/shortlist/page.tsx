import Link from "next/link";
import {
  checkCarStatus,
  getShortlistedCars,
  isStatusStale,
  type CarRow,
} from "../../src/db/queries.js";
import { tt, type Lang } from "../../src/i18n.js";
import { toggleShortlistAction } from "../../src/actions.js";
import { brandEnglish, modelEnglish } from "../../src/catalog-lookup.js";
import { getKrwPerEur, fmtEur } from "../../src/fx.js";
import { photoUrlSized } from "../../src/photo.js";
import { getDict, getLang } from "../i18n/server";
import type { Dict } from "../i18n/dict";

type ShortlistT = Dict["shortlist"];

function format(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k) => String(vars[k] ?? ""));
}

export async function generateMetadata() {
  const dict = await getDict();
  return { title: dict.shortlist.pageTitle };
}

const SHORTLIST_STATUS_STALE_MS = 6 * 60 * 60 * 1000;

type ShortlistedCar = CarRow & { note: string | null; added_at: string };

/** Direction of "better" for each comparable column. */
type Direction = "min" | "max" | "false";

interface Row {
  label: string;
  /** Pull a comparable number from each car. null = N/A (no winner). */
  value: (c: ShortlistedCar) => number | null;
  /** How to render the cell. */
  render: (c: ShortlistedCar) => string;
  direction?: Direction;
  /** Optional CSS class for the row label */
  highlight?: "good" | "bad";
}

function yearFromFirstReg(d: string | null): string {
  if (!d || d.length < 4) return "—";
  return d.slice(0, 4);
}

function yearMonthNum(d: string | null | undefined): number | null {
  if (!d || d.length < 6) return null;
  return Number(d.slice(0, 6));
}

function buildRows(krwPerEur: number, t: ShortlistT, lang: Lang): Row[] {
  const noData = t.noData;
  const yes = t.yes;
  const no = t.no;
  return [
  // Spec
  {
    label: t.rows.year,
    value: (c) => yearMonthNum(c.first_registration_date),
    render: (c) => yearFromFirstReg(c.first_registration_date),
    direction: "max",
  },
  {
    label: t.rows.mileage,
    value: (c) => c.mileage_km,
    render: (c) => (c.mileage_km != null ? `${c.mileage_km.toLocaleString(lang)} km` : "—"),
    direction: "min",
  },
  {
    label: t.rows.price,
    value: (c) => c.price_won,
    render: (c) => fmtEur(c.price_won, krwPerEur),
    direction: "min",
  },
  {
    label: t.rows.fuel,
    value: () => null,
    render: (c) => (c.fuel ? tt(c.fuel, "fuel", lang) : "—"),
  },
  {
    label: t.rows.transmission,
    value: () => null,
    render: (c) => (c.transmission ? tt(c.transmission, "transmission", lang) : "—"),
  },
  {
    label: t.rows.color,
    value: () => null,
    render: (c) => (c.color ? tt(c.color, "color", lang) : "—"),
  },
  {
    label: t.rows.engineCc,
    value: (c) => c.displacement_cc,
    render: (c) => (c.displacement_cc ? `${c.displacement_cc} cc` : "—"),
  },

  // Accident
  {
    label: t.rows.accidentsTotal,
    value: (c) => c.accident_count,
    render: (c) =>
      c.has_accident_history
        ? format(t.accidentSelfOther, {
            n: c.accident_count ?? 0,
            self: c.self_accident_count ?? 0,
            other: c.other_accident_count ?? 0,
          })
        : noData,
    direction: "min",
  },
  {
    label: t.rows.repairCost,
    value: (c) => c.total_repair_cost_won,
    render: (c) => (c.has_accident_history ? fmtEur(c.total_repair_cost_won, krwPerEur) : noData),
    direction: "min",
  },
  {
    label: t.rows.ownerChanges,
    value: (c) => c.owner_change_count,
    render: (c) => (c.has_accident_history ? String(c.owner_change_count ?? 0) : noData),
    direction: "min",
  },
  {
    label: t.rows.plateChanges,
    value: (c) => c.plate_change_count,
    render: (c) => (c.has_accident_history ? String(c.plate_change_count ?? 0) : noData),
    direction: "min",
  },
  {
    label: t.rows.uninsuredPeriods,
    value: (c) => c.uninsured_periods_count,
    render: (c) =>
      c.has_accident_history ? String(c.uninsured_periods_count ?? 0) : noData,
    direction: "min",
    highlight: "bad",
  },
  {
    label: t.rows.floodTheftLoss,
    value: (c) => (c.flood_damage_count ?? 0) + (c.theft_count ?? 0) + (c.total_loss_count ?? 0),
    render: (c) =>
      c.has_accident_history
        ? `${c.flood_damage_count ?? 0} / ${c.theft_count ?? 0} / ${c.total_loss_count ?? 0}`
        : noData,
    direction: "min",
    highlight: "bad",
  },
  {
    label: t.rows.businessGovUse,
    value: (c) => (c.business_use ?? 0) + (c.government_use ?? 0),
    render: (c) => (c.has_accident_history ? `${c.business_use ? yes : no} / ${c.government_use ? yes : no}` : noData),
    direction: "min",
    highlight: "bad",
  },

  // Inspection
  {
    label: t.rows.inspectorFlagged,
    value: (c) => c.inspector_says_accident,
    render: (c) =>
      c.has_inspection ? (c.inspector_says_accident ? yes : no) : noData,
    direction: "min",
  },
  {
    label: t.rows.waterLog,
    value: (c) => c.has_water_log,
    render: (c) => (c.has_inspection ? (c.has_water_log ? yes : no) : noData),
    direction: "min",
    highlight: "bad",
  },
  {
    label: t.rows.tuned,
    value: (c) => c.has_tuning,
    render: (c) => (c.has_inspection ? (c.has_tuning ? yes : no) : noData),
  },
  {
    label: t.rows.recallCompleted,
    value: (c) => (c.recall_completed != null ? c.recall_completed : null),
    render: (c) =>
      c.has_inspection ? (c.recall_completed ? yes : no) : noData,
  },

  // Metadata
  {
    label: t.rows.status,
    value: () => null,
    render: (c) => c.status ?? "—",
  },
  {
    label: t.rows.firstSeen,
    value: () => null,
    render: (c) => c.first_seen_at.slice(0, 10),
  },
  ];
}

/** For a row's "best" direction, find which car ids are tied for best. */
function bestCarIds(cars: ShortlistedCar[], row: Row): Set<number> {
  if (!row.direction) return new Set();
  const values = cars.map((c) => ({ id: c.car_id, v: row.value(c) }));
  const numeric = values.filter((x): x is { id: number; v: number } => x.v != null);
  if (numeric.length < 2) return new Set();
  const best =
    row.direction === "max"
      ? Math.max(...numeric.map((x) => x.v))
      : Math.min(...numeric.map((x) => x.v));
  return new Set(numeric.filter((x) => x.v === best).map((x) => x.id));
}

export default async function ShortlistPage() {
  // First pass — get whatever is cached, then verify any rows whose status is
  // stale before re-reading. checkCarStatus writes back to the DB and is
  // concurrency-limited by ENRICH_LIMIT, so 50 stale items still play nicely
  // with Encar. Most loads will skip the check entirely.
  const initial = getShortlistedCars();
  const stale = initial.filter((c) => isStatusStale(c.last_status_check_at, SHORTLIST_STATUS_STALE_MS));
  const [, krwPerEur, dict, lang] = await Promise.all([
    stale.length > 0
      ? Promise.all(stale.map((c) => checkCarStatus(c.car_id).catch(() => null)))
      : Promise.resolve(null),
    getKrwPerEur(),
    getDict(),
    getLang(),
  ]);
  const t = dict.shortlist;
  const cars = stale.length > 0 ? getShortlistedCars() : initial;
  const rows = buildRows(krwPerEur, t, lang);

  if (cars.length === 0) {
    return (
      <div className="mx-auto grid max-w-7xl gap-3 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">{t.pageTitle}</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">{t.emptyHint}</p>
        <p className="text-sm">
          <Link href="/" className="text-blue-600 hover:underline">{t.backToSearch}</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">
          {format(t.pageTitleWithCount, { n: cars.length, s: cars.length === 1 ? "" : "s" })}
        </h1>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <table className="text-sm border-separate border-spacing-0 min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-neutral-50 dark:bg-neutral-900 text-left p-3 text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 w-48">
                {t.field}
              </th>
              {cars.map((c) => {
                const photo = photoUrlSized(c.featured_photo_path, "medium");
                return (
                <th
                  key={c.car_id}
                  className="text-left p-3 border-b border-neutral-200 dark:border-neutral-800 align-top min-w-[14rem]"
                >
                  <div className="space-y-2">
                    <Link href={`/car/${c.car_id}`} className="block rounded-lg overflow-hidden bg-neutral-100 dark:bg-neutral-900 aspect-[16/9]">
                      {photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={photo}
                          alt=""
                          loading="lazy"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                          {t.noPhoto}
                        </span>
                      )}
                    </Link>
                    <Link href={`/car/${c.car_id}`} className="font-semibold hover:underline block leading-tight">
                      {c.manufacturer_eng ?? brandEnglish(c.manufacturer) ?? c.manufacturer} {modelEnglish(c.manufacturer, c.model)}
                    </Link>
                    <div className="text-xs text-neutral-500 font-normal">
                      {c.grade_english || c.grade_name || ""}
                    </div>
                    {c.listing_state === "sold" && (
                      <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">
                        {t.noLongerOnEncar}
                      </span>
                    )}
                    <form action={toggleShortlistAction} className="pt-1">
                      <input type="hidden" name="carId" value={c.car_id} />
                      <input type="hidden" name="action" value="remove" />
                      <button
                        type="submit"
                        className="text-xs text-neutral-500 hover:text-red-600 font-normal"
                      >
                        {t.remove}
                      </button>
                    </form>
                  </div>
                </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {rows.map((row: Row) => {
              const best = bestCarIds(cars, row);
              const rowLabelClass =
                row.highlight === "good"
                  ? "text-emerald-700 dark:text-emerald-400"
                  : row.highlight === "bad"
                    ? "text-amber-700 dark:text-amber-400"
                    : "text-neutral-600 dark:text-neutral-400";
              return (
                <tr key={row.label} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-900/30">
                  <th
                    className={`sticky left-0 z-10 bg-white dark:bg-neutral-950 text-left p-2 font-medium border-b border-neutral-100 dark:border-neutral-900 ${rowLabelClass}`}
                  >
                    {row.label}
                  </th>
                  {cars.map((c) => {
                    const isBest = best.has(c.car_id);
                    return (
                      <td
                        key={c.car_id}
                        className={`p-2 border-b border-neutral-100 dark:border-neutral-900 font-mono align-top ${
                          isBest
                            ? "bg-emerald-50 dark:bg-emerald-950/30 text-emerald-900 dark:text-emerald-200 font-semibold"
                            : ""
                        }`}
                      >
                        {row.render(c)}
                      </td>
                    );
                  })}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <p className="text-xs text-neutral-500">{t.legend}</p>
    </div>
  );
}
