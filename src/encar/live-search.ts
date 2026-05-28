/**
 * Live Encar search: turn a UI filter object into an Encar query, hit
 * /search/car/list/premium, and return card-ready rows. No DB involved.
 *
 * Wrapped in unstable_cache so quick re-submits / back-button hits don't burn
 * Encar API calls — CloudFront throttles /search/* hard.
 */

import { unstable_cache } from "next/cache";
import { searchListings, type SearchOptions } from "./client.js";
import {
  and,
  c,
  fuelType,
  manufacturer,
  mileageRange,
  modelGroup,
  priceRange,
  render,
  visible,
  yearRange,
  type Expr,
} from "./query.js";
import type { Listing } from "./types.js";
import { findModelGroupKey, modelEnglish, brandEnglish } from "../catalog-lookup.js";
import { inferDrivetrain } from "../drivetrain.js";
import { inferPower } from "../power-lookup.js";

export interface LiveSearchFilters {
  brand?: string;
  /** Free-text model match — translated via findModelGroupKey. */
  model?: string;
  /** Max price in 만원 (so the page's "maxPriceM" param is already in this unit ×100). */
  maxPriceMan?: number;
  maxMileageKm?: number;
  minYear?: number;
  maxYear?: number;
  /** Encar's Korean fuel string — e.g. "디젤", "가솔린". */
  fuel?: string;
  sort?: "fresh" | "price" | "mileage" | "year";
  limit?: number;
  offset?: number;
}

/**
 * Card-ready row built from a listing payload. Fields mirror CarRow names where
 * possible so the search-page UI can stay close to its old shape.
 */
export interface ListingRow {
  car_id: number;
  manufacturer: string;
  manufacturer_eng: string | null;
  model: string;
  model_eng: string | null;
  grade_name: string;
  grade_english: string | null;
  fuel: string;
  transmission: string;
  /** Inferred from grade text — same logic as ingest. */
  drivetrain: "2WD" | "4WD" | null;
  power_hp: number | null;
  mileage_km: number;
  /** In KRW (already converted from Encar's 만원 unit). */
  price_won: number;
  /** YYYY (from FormYear). */
  year: number;
  /** Encar Photo prefix — append "001.jpg". */
  photo_prefix: string;
  /** YYYY-MM-DD style first registration approximation. */
  first_registration_date: string | null;
  modified_date: string;
}

function buildQuery(f: LiveSearchFilters): Expr {
  const parts: Expr[] = [];

  if (f.brand) {
    const modelKey = f.model ? findModelGroupKey(f.brand, f.model) : null;
    // Match the shape used by refreshSearchAction: wrap in `C.` only when there
    // are multiple constraints; a single Manufacturer goes in bare.
    parts.push(modelKey ? c(manufacturer(f.brand), modelGroup(modelKey)) : manufacturer(f.brand));
  }

  // Year range. Encar's `Year` field is YYYYMM as a float (202107.0 = July 2021),
  // so range bounds must also be YYYYMM.
  if (f.minYear || f.maxYear) {
    const from = (f.minYear ?? 1990) * 100 + 1;
    const to = (f.maxYear ?? new Date().getFullYear()) * 100 + 12;
    parts.push(yearRange(from, to));
  }

  if (f.maxPriceMan) parts.push(priceRange(0, f.maxPriceMan));
  if (f.maxMileageKm) parts.push(mileageRange(0, f.maxMileageKm));
  if (f.fuel) parts.push(fuelType(f.fuel));

  // Always include Hidden.N. Always.
  return and(visible, ...parts);
}

function sortParam(s: LiveSearchFilters["sort"]): SearchOptions["sort"] {
  // Encar's `Price`/`Mileage`/`Year` must be suffixed with `Asc`/`Desc`. Bare
  // names return 400 "is not valid sort name". The defaults match what the
  // search form labels say ("low → high" for price/mileage, "new → old" for year).
  if (s === "price") return "PriceAsc";
  if (s === "mileage") return "MileageAsc";
  if (s === "year") return "YearDesc";
  return "ModifiedDate";
}

function yearFromListing(l: Listing): number {
  if (l.FormYear) return l.FormYear;
  // Year is YYYYMM as a float, e.g. 202107.0
  return Math.floor(l.Year / 100);
}

function firstRegFromListing(l: Listing): string | null {
  // Listings don't include a true first-registration date — we use Year (YYYYMM)
  // as a proxy so the search card and the cached row format match shape-wise.
  // Detail page will overwrite with the real value once enriched.
  if (!l.Year) return null;
  const ym = String(Math.floor(l.Year)).padStart(6, "0");
  return `${ym}01`;
}

function mapListing(l: Listing): ListingRow {
  const manufacturerEng = brandEnglish(l.Manufacturer);
  const modelEng = modelEnglish(l.Manufacturer, l.Model);
  const drivetrain = inferDrivetrain(manufacturerEng, l.Badge, l.Model);
  const power = inferPower(manufacturerEng, l.Badge, null);
  return {
    car_id: l.Id,
    manufacturer: l.Manufacturer,
    manufacturer_eng: manufacturerEng,
    model: l.Model,
    model_eng: modelEng,
    grade_name: l.Badge,
    grade_english: null,
    fuel: l.FuelType,
    transmission: l.Transmission,
    drivetrain,
    power_hp: power?.hp ?? null,
    mileage_km: Math.round(l.Mileage),
    price_won: Math.round(l.Price * 10_000),
    year: yearFromListing(l),
    photo_prefix: l.Photo,
    first_registration_date: firstRegFromListing(l),
    modified_date: l.ModifiedDate,
  };
}

const fetchListingsCached = unstable_cache(
  async (queryString: string, sort: SearchOptions["sort"], offset: number, limit: number) => {
    const res = await searchListings(queryString, { sort, offset, limit });
    return res;
  },
  ["encar-search"],
  // 60s is enough to absorb back-button/refresh chatter without showing
  // dangerously stale listings. ModifiedDate sort still surfaces new stock.
  { revalidate: 60 },
);

// Encar's SellType field marks lease/rental takeover listings. Korean values
// like "리스" (lease), "리스승계" (lease takeover), "렌트" / "장기렌트" /
// "월렌트" (monthly rent) all mean the listing isn't a straight sale — the
// "price" is a deposit + monthly payments, not what you'd pay to own the car.
// Regular sales have SellType empty or "일반".
function isLeaseOrRental(sellType: string | undefined): boolean {
  if (!sellType) return false;
  return sellType.includes("리스") || sellType.includes("렌트");
}

/**
 * Run a live Encar search and return mapped rows. Pre-filters by Encar's
 * facets where it can; post-filters in JS to drop lease/rental listings.
 */
export async function liveSearch(filters: LiveSearchFilters): Promise<{
  rows: ListingRow[];
  totalCount: number;
}> {
  const query = buildQuery(filters);
  // Render to string so unstable_cache can use it as a cache key.
  const queryString = render(query);
  const sort = sortParam(filters.sort);
  const offset = filters.offset ?? 0;
  const limit = filters.limit ?? 20;

  const res = await fetchListingsCached(queryString, sort, offset, limit);
  const kept = res.SearchResults.filter((l) => !isLeaseOrRental(l.SellType));
  return {
    rows: kept.map(mapListing),
    // Approximate — we're dropping rows post-fetch, so the displayed total may
    // overstate by the number of lease/rental hits we filtered out this page.
    totalCount: res.Count - (res.SearchResults.length - kept.length),
  };
}
