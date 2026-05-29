import Link from "next/link";
import {
  checkCarStatus,
  getShortlistedCars,
  isStatusStale,
  type CarRow,
} from "../../src/db/queries.js";
import { tt } from "../../src/i18n.js";
import { toggleShortlistAction } from "../../src/actions.js";
import { modelEnglish } from "../../src/catalog-lookup.js";
import { getKrwPerEur, fmtEur } from "../../src/fx.js";
import { photoUrlSized } from "../../src/photo.js";

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

function buildRows(krwPerEur: number): Row[] {
  return [
  // Spec
  {
    label: "Year (first reg)",
    value: (c) => yearMonthNum(c.first_registration_date),
    render: (c) => yearFromFirstReg(c.first_registration_date),
    direction: "max",
  },
  {
    label: "Mileage",
    value: (c) => c.mileage_km,
    render: (c) => (c.mileage_km != null ? `${c.mileage_km.toLocaleString()} km` : "—"),
    direction: "min",
  },
  {
    label: "Price",
    value: (c) => c.price_won,
    render: (c) => fmtEur(c.price_won, krwPerEur),
    direction: "min",
  },
  {
    label: "Fuel",
    value: () => null,
    render: (c) => (c.fuel ? tt(c.fuel, "fuel") : "—"),
  },
  {
    label: "Transmission",
    value: () => null,
    render: (c) => (c.transmission ? tt(c.transmission, "transmission") : "—"),
  },
  {
    label: "Color",
    value: () => null,
    render: (c) => (c.color ? tt(c.color, "color") : "—"),
  },
  {
    label: "Engine cc",
    value: (c) => c.displacement_cc,
    render: (c) => (c.displacement_cc ? `${c.displacement_cc} cc` : "—"),
  },

  // Accident
  {
    label: "Accidents (total)",
    value: (c) => c.accident_count,
    render: (c) =>
      c.has_accident_history
        ? `${c.accident_count ?? 0} (self ${c.self_accident_count ?? 0}, other ${c.other_accident_count ?? 0})`
        : "no data",
    direction: "min",
  },
  {
    label: "Repair cost (KIDI)",
    value: (c) => c.total_repair_cost_won,
    render: (c) => (c.has_accident_history ? fmtEur(c.total_repair_cost_won, krwPerEur) : "no data"),
    direction: "min",
  },
  {
    label: "Owner changes",
    value: (c) => c.owner_change_count,
    render: (c) => (c.has_accident_history ? String(c.owner_change_count ?? 0) : "no data"),
    direction: "min",
  },
  {
    label: "Plate changes",
    value: (c) => c.plate_change_count,
    render: (c) => (c.has_accident_history ? String(c.plate_change_count ?? 0) : "no data"),
    direction: "min",
  },
  {
    label: "Uninsured periods",
    value: (c) => c.uninsured_periods_count,
    render: (c) =>
      c.has_accident_history ? String(c.uninsured_periods_count ?? 0) : "no data",
    direction: "min",
    highlight: "bad",
  },
  {
    label: "Flood / theft / loss",
    value: (c) => (c.flood_damage_count ?? 0) + (c.theft_count ?? 0) + (c.total_loss_count ?? 0),
    render: (c) =>
      c.has_accident_history
        ? `${c.flood_damage_count ?? 0} / ${c.theft_count ?? 0} / ${c.total_loss_count ?? 0}`
        : "no data",
    direction: "min",
    highlight: "bad",
  },
  {
    label: "Business / gov use",
    value: (c) => (c.business_use ?? 0) + (c.government_use ?? 0),
    render: (c) => (c.has_accident_history ? `${c.business_use ? "Y" : "no"} / ${c.government_use ? "Y" : "no"}` : "no data"),
    direction: "min",
    highlight: "bad",
  },

  // Inspection
  {
    label: "Inspector flagged accident",
    value: (c) => c.inspector_says_accident,
    render: (c) =>
      c.has_inspection ? (c.inspector_says_accident ? "YES" : "no") : "no data",
    direction: "min",
  },
  {
    label: "Water log",
    value: (c) => c.has_water_log,
    render: (c) => (c.has_inspection ? (c.has_water_log ? "YES" : "no") : "no data"),
    direction: "min",
    highlight: "bad",
  },
  {
    label: "Tuned",
    value: (c) => c.has_tuning,
    render: (c) => (c.has_inspection ? (c.has_tuning ? "yes" : "no") : "no data"),
  },
  {
    label: "Recall completed",
    value: (c) => (c.recall_completed != null ? c.recall_completed : null),
    render: (c) =>
      c.has_inspection ? (c.recall_completed ? "yes" : "no/NA") : "no data",
  },

  // Metadata
  {
    label: "Status",
    value: () => null,
    render: (c) => c.status ?? "—",
  },
  {
    label: "First seen by us",
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
  const [, krwPerEur] = await Promise.all([
    stale.length > 0
      ? Promise.all(stale.map((c) => checkCarStatus(c.car_id).catch(() => null)))
      : Promise.resolve(null),
    getKrwPerEur(),
  ]);
  const cars = stale.length > 0 ? getShortlistedCars() : initial;
  const rows = buildRows(krwPerEur);

  if (cars.length === 0) {
    return (
      <div className="mx-auto grid max-w-7xl gap-3 px-4 py-10 sm:px-6">
        <h1 className="text-2xl font-bold">Shortlist</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          Nothing here yet. Open a car detail page and click <em>Add to shortlist</em>.
        </p>
        <p className="text-sm">
          <Link href="/" className="text-blue-600 hover:underline">← Back to search</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6">
      <div className="flex items-baseline justify-between">
        <h1 className="text-2xl font-bold">
          Shortlist — {cars.length} car{cars.length === 1 ? "" : "s"}
        </h1>
        <Link href="/" className="text-sm text-blue-600 hover:underline">← refine search</Link>
      </div>

      <div className="overflow-x-auto -mx-4 px-4 pb-4">
        <table className="text-sm border-separate border-spacing-0 min-w-full">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-neutral-50 dark:bg-neutral-900 text-left p-3 text-xs uppercase tracking-wide text-neutral-500 border-b border-neutral-200 dark:border-neutral-800 w-48">
                Field
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
                          no photo
                        </span>
                      )}
                    </Link>
                    <Link href={`/car/${c.car_id}`} className="font-semibold hover:underline block leading-tight">
                      {c.manufacturer_eng ?? c.manufacturer} {modelEnglish(c.manufacturer, c.model)}
                    </Link>
                    <div className="text-xs text-neutral-500 font-normal">
                      {c.grade_english || c.grade_name || ""}
                    </div>
                    {c.listing_state === "sold" && (
                      <span className="inline-block text-[10px] font-semibold px-1.5 py-0.5 rounded bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300">
                        No longer on Encar
                      </span>
                    )}
                    <form action={toggleShortlistAction} className="pt-1">
                      <input type="hidden" name="carId" value={c.car_id} />
                      <input type="hidden" name="action" value="remove" />
                      <button
                        type="submit"
                        className="text-xs text-neutral-500 hover:text-red-600 font-normal"
                      >
                        Remove
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

      <p className="text-xs text-neutral-500">
        Green-highlighted cell = best in that row (lowest mileage, lowest price, fewest accidents, etc.).
        Rows in amber are red-flag categories where you want all cars to be 0.
      </p>
    </div>
  );
}
