import Link from "next/link";
import { searchCars, type CarRow, type SearchFilters } from "../../src/db/queries.js";
import { tt } from "../../src/i18n.js";
import { modelEnglish } from "../../src/catalog-lookup.js";
import { photoUrl } from "../../src/photo.js";
import { refreshSearchAction } from "../../src/actions.js";

const KRW_PER_EUR = 1400;

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function pickNum(v: string | string[] | undefined): number | undefined {
  const s = pickStr(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

function priceM(p: number | null): string {
  if (p == null) return "—";
  return `₩${(p / 1_000_000).toFixed(1)}M`;
}

function priceEur(p: number | null): string {
  if (p == null) return "";
  return `€${Math.round(p / KRW_PER_EUR).toLocaleString()}`;
}

function yearFromFirstReg(d: string | null): string {
  if (!d || d.length < 4) return "—";
  return d.slice(0, 4);
}

function timeAgo(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  const min = Math.round(ms / 60_000);
  if (min < 1) return "just now";
  if (min < 60) return `${min} min ago`;
  const hr = Math.round(min / 60);
  if (hr < 24) return `${hr} hour${hr === 1 ? "" : "s"} ago`;
  const d = Math.round(hr / 24);
  return `${d} day${d === 1 ? "" : "s"} ago`;
}

function redFlags(c: CarRow): string[] {
  const flags: string[] = [];
  if ((c.accident_count ?? 0) >= 3) flags.push(`${c.accident_count} accidents`);
  if ((c.total_repair_cost_won ?? 0) >= 5_000_000) flags.push(`₩${((c.total_repair_cost_won ?? 0) / 1_000_000).toFixed(1)}M repairs`);
  if ((c.owner_change_count ?? 0) >= 3) flags.push(`${c.owner_change_count} owners`);
  if (c.flood_damage_count && c.flood_damage_count > 0) flags.push("Flood");
  if (c.theft_count && c.theft_count > 0) flags.push("Theft");
  if (c.total_loss_count && c.total_loss_count > 0) flags.push("Total loss");
  if (c.has_water_log) flags.push("Water log");
  if (c.business_use) flags.push("Business use");
  if (c.uninsured_periods_count && c.uninsured_periods_count > 0) flags.push("Uninsured period");
  return flags;
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const drivetrainParam = pickStr(sp.drivetrain);
  const filters: SearchFilters = {
    brand: pickStr(sp.brand),
    model: pickStr(sp.model),
    maxPriceWon: pickNum(sp.maxPriceM) ? pickNum(sp.maxPriceM)! * 1_000_000 : undefined,
    maxMileageKm: pickNum(sp.maxMileage),
    minYear: pickNum(sp.minYear),
    maxYear: pickNum(sp.maxYear),
    maxAccidentCount: pickNum(sp.maxAcc),
    maxOwnerChanges: pickNum(sp.maxOwn),
    excludeFlood: pickStr(sp.noFlood) === "on",
    fuel: pickStr(sp.fuel) || undefined,
    drivetrain: drivetrainParam === "2WD" || drivetrainParam === "4WD" ? drivetrainParam : undefined,
    vinUnique: pickStr(sp.vinUnique) === "on",
    sort: (pickStr(sp.sort) as "price" | "mileage" | "year" | "fresh" | undefined) ?? "fresh",
    limit: 100,
  };

  const cars = searchCars(filters);

  // Newest last_fetched_at across the result set — proxy for "data freshness"
  const newest = cars.reduce<string | null>((acc, c) => {
    if (!acc) return c.last_fetched_at;
    return c.last_fetched_at > acc ? c.last_fetched_at : acc;
  }, null);

  return (
    <div className="grid gap-4">
      <div className="flex items-baseline justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold">
            {cars.length} result{cars.length === 1 ? "" : "s"}
          </h1>
          {newest && (
            <p className="text-xs text-neutral-500 mt-0.5">
              Newest data fetched {timeAgo(newest)}
            </p>
          )}
        </div>
        <div className="flex items-center gap-3">
          {filters.brand && (
            <form action={refreshSearchAction}>
              <input type="hidden" name="brand" value={filters.brand} />
              {filters.model && <input type="hidden" name="model" value={filters.model} />}
              <button
                type="submit"
                title="Re-fetch the first 20 listings from Encar for this brand+model"
                className="text-sm px-3 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
              >
                ↻ Refresh from Encar
              </button>
            </form>
          )}
          <Link href="/" className="text-sm text-blue-600 hover:underline">
            ← refine search
          </Link>
        </div>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {cars.map((c) => {
          const flags = redFlags(c);
          const photo = photoUrl(c.featured_photo_path);
          return (
            <li
              key={c.car_id}
              className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden hover:shadow-sm transition-shadow"
            >
              <Link href={`/car/${c.car_id}`} className="block">
                {photo ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={photo}
                    alt=""
                    loading="lazy"
                    className="w-full aspect-[4/3] object-cover bg-neutral-100 dark:bg-neutral-900"
                  />
                ) : (
                  <div className="w-full aspect-[4/3] bg-neutral-100 dark:bg-neutral-900 flex items-center justify-center text-xs text-neutral-400">
                    no photo
                  </div>
                )}
                <div className="p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <h2 className="font-semibold leading-tight">
                    {c.manufacturer_eng ?? c.manufacturer} {modelEnglish(c.manufacturer, c.model)}
                  </h2>
                  <span className="text-sm font-mono whitespace-nowrap">
                    {priceM(c.price_won)}
                    <span className="text-neutral-500 ml-1 text-xs">{priceEur(c.price_won)}</span>
                  </span>
                </div>
                <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
                  {c.grade_english || c.grade_name || "—"}
                </div>
                <div className="text-xs text-neutral-500 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>{yearFromFirstReg(c.first_registration_date)}</span>
                  <span>{c.mileage_km != null ? `${c.mileage_km.toLocaleString()} km` : "—"}</span>
                  <span>{c.fuel ? tt(c.fuel, "fuel") : "—"}</span>
                  <span>{c.transmission ? tt(c.transmission, "transmission") : "—"}</span>
                  {c.drivetrain && (
                    <span
                      className={
                        c.drivetrain === "4WD"
                          ? "px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                          : "px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                      }
                    >
                      {c.drivetrain}
                    </span>
                  )}
                  {c.power_hp && (
                    <span className="text-neutral-600 dark:text-neutral-400">
                      {c.power_hp} hp
                    </span>
                  )}
                </div>
                {c.has_accident_history ? (
                  <div className="text-xs mt-2">
                    <span className="text-neutral-500">Accidents: </span>
                    <span className={c.accident_count && c.accident_count > 0 ? "text-amber-700 dark:text-amber-400" : "text-emerald-700 dark:text-emerald-400"}>
                      {c.accident_count ?? 0}
                    </span>
                    {(c.owner_change_count ?? 0) > 0 && (
                      <span className="text-neutral-500"> · {c.owner_change_count} owner{c.owner_change_count === 1 ? "" : "s"}</span>
                    )}
                  </div>
                ) : (
                  <div className="text-xs mt-2 text-neutral-400 italic">No accident data</div>
                )}
                {flags.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {flags.map((f) => (
                      <span key={f} className="text-xs bg-amber-100 dark:bg-amber-950/40 text-amber-900 dark:text-amber-300 px-1.5 py-0.5 rounded">
                        {f}
                      </span>
                    ))}
                  </div>
                )}
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {cars.length === 0 && (
        <div className="text-sm text-neutral-600 dark:text-neutral-400 py-12 text-center">
          No matches. Loosen filters or ingest more cars.
        </div>
      )}
    </div>
  );
}
