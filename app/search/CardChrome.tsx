/**
 * Visual shell for a search-result card. Renders only what comes back from the
 * live Encar search call — no KIDI/VIN enrichment, no DB round-trips.
 */

import Link from "next/link";
import { tt } from "../../src/i18n.js";
import type { ListingRow } from "../../src/encar/live-search.js";

const PHOTO_CDN = "https://ci.encar.com";

function priceEur(p: number, krwPerEur: number): string {
  return `€${Math.round(p / krwPerEur).toLocaleString()}`;
}

function photoUrl(prefix: string | null): string | null {
  if (!prefix) return null;
  return `${PHOTO_CDN}${prefix}001.jpg`;
}

export function CardChrome({
  listing,
  krwPerEur,
}: {
  listing: ListingRow;
  krwPerEur: number;
}) {
  const photo = photoUrl(listing.photo_prefix);

  return (
    <li className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 overflow-hidden hover:shadow-sm transition-shadow">
      <Link href={`/car/${listing.car_id}`} className="block">
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
              {listing.manufacturer_eng ?? listing.manufacturer} {listing.model_eng ?? listing.model}
            </h2>
            <span className="text-sm font-mono whitespace-nowrap">
              {priceEur(listing.price_won, krwPerEur)}
            </span>
          </div>
          <div className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">{listing.grade_name}</div>
          <div className="text-xs text-neutral-500 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1">
            <span>{listing.year}</span>
            <span>{listing.mileage_km.toLocaleString()} km</span>
            <span>{tt(listing.fuel, "fuel")}</span>
            <span>{tt(listing.transmission, "transmission")}</span>
            {listing.drivetrain && (
              <span
                className={
                  listing.drivetrain === "4WD"
                    ? "px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-100 dark:bg-emerald-950/40 text-emerald-800 dark:text-emerald-300"
                    : "px-1.5 py-0.5 rounded text-[10px] font-semibold bg-neutral-200 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300"
                }
              >
                {listing.drivetrain}
              </span>
            )}
            {listing.power_hp && (
              <span className="text-neutral-600 dark:text-neutral-400">{listing.power_hp} hp</span>
            )}
          </div>
        </div>
      </Link>
    </li>
  );
}
