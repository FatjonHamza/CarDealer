/**
 * Read-only SQL helpers for the UI. All queries hit the local SQLite DB
 * — no live Encar calls from page renders.
 */

import { db } from "./index.js";
import type {
  AccidentHistory,
  Diagnosis,
  InspectionRecord,
  Vehicle,
} from "../encar/types.js";

export interface CarRow {
  car_id: number;
  vehicle_no: string | null;
  vin: string | null;
  manufacturer: string | null;
  manufacturer_eng: string | null;
  model: string | null;
  model_eng: string | null;
  grade_name: string | null;
  grade_english: string | null;
  mileage_km: number | null;
  displacement_cc: number | null;
  power_hp: number | null;
  power_kw: number | null;
  power_source: string | null;
  drivetrain: string | null;
  fuel: string | null;
  transmission: string | null;
  color: string | null;
  body_type: string | null;
  seat_count: number | null;
  featured_photo_path: string | null;
  price_won: number | null;
  status: string | null;
  one_line_text: string | null;
  first_registration_date: string | null;
  motor_type: string | null;
  has_water_log: number | null;
  has_tuning: number | null;
  recall_completed: number | null;
  inspector_says_accident: number | null;
  inspection_comments: string | null;
  inspection_supply_num: string | null;
  accident_count: number | null;
  self_accident_count: number | null;
  other_accident_count: number | null;
  total_repair_cost_won: number | null;
  owner_change_count: number | null;
  plate_change_count: number | null;
  flood_damage_count: number | null;
  theft_count: number | null;
  total_loss_count: number | null;
  uninsured_periods_count: number | null;
  business_use: number | null;
  government_use: number | null;
  loan_flag: number | null;
  has_vehicle: number;
  has_inspection: number;
  has_accident_history: number;
  has_diagnosis: number;
  first_ad_date: string | null;
  modify_date: string | null;
  first_seen_at: string;
  last_fetched_at: string;
  /** 'active' | 'sold' | 'unknown' — has the listing been pulled from Encar? */
  listing_state: string;
  last_status_check_at: string | null;
}

export interface CarRowWithBlobs extends CarRow {
  vehicle_json: string | null;
  inspection_json: string | null;
  accident_history_json: string | null;
  diagnosis_json: string | null;
}

export interface SearchFilters {
  brand?: string;
  model?: string;
  minPriceWon?: number;
  maxPriceWon?: number;
  maxMileageKm?: number;
  /** Inclusive — e.g. 2018 matches any car with firstRegistrationDate >= 20180101 */
  minYear?: number;
  /** Inclusive — e.g. 2022 matches any car with firstRegistrationDate <= 20221231 */
  maxYear?: number;
  maxAccidentCount?: number;
  maxOwnerChanges?: number;
  excludeFlood?: boolean;
  hasInspection?: boolean;
  /** Encar's Korean fuel string — e.g. "디젤", "가솔린", "하이브리드". */
  fuel?: string;
  /** "2WD" or "4WD" as stored by inferDrivetrain. */
  drivetrain?: "2WD" | "4WD";
  vinUnique?: boolean; // group same-VIN duplicates and prefer the one with data
  sort?: "price" | "mileage" | "year" | "fresh";
  limit?: number;
}

export function searchCars(filters: SearchFilters = {}): CarRow[] {
  const where: string[] = ["1=1"];
  const params: Record<string, unknown> = {};

  if (filters.brand) { where.push("manufacturer = @brand"); params.brand = filters.brand; }
  if (filters.model) {
    // Match either the Korean-as-stored model name or the English equivalent.
    where.push("(model LIKE @model OR model_eng LIKE @model)");
    params.model = `%${filters.model}%`;
  }
  if (filters.minPriceWon !== undefined) { where.push("price_won >= @minPrice"); params.minPrice = filters.minPriceWon; }
  if (filters.maxPriceWon !== undefined) { where.push("price_won <= @maxPrice"); params.maxPrice = filters.maxPriceWon; }
  if (filters.maxMileageKm !== undefined) { where.push("mileage_km <= @maxMileage"); params.maxMileage = filters.maxMileageKm; }
  if (filters.minYear !== undefined) {
    where.push("first_registration_date >= @minYearDate");
    params.minYearDate = `${filters.minYear}0101`;
  }
  if (filters.maxYear !== undefined) {
    where.push("first_registration_date <= @maxYearDate");
    params.maxYearDate = `${filters.maxYear}1231`;
  }
  if (filters.maxAccidentCount !== undefined) {
    where.push("(accident_count IS NULL OR accident_count <= @maxAcc)");
    params.maxAcc = filters.maxAccidentCount;
  }
  if (filters.maxOwnerChanges !== undefined) {
    where.push("(owner_change_count IS NULL OR owner_change_count <= @maxOwn)");
    params.maxOwn = filters.maxOwnerChanges;
  }
  if (filters.excludeFlood) {
    where.push("(flood_damage_count IS NULL OR flood_damage_count = 0)");
  }
  if (filters.hasInspection) where.push("has_inspection = 1");
  if (filters.fuel) { where.push("fuel = @fuel"); params.fuel = filters.fuel; }
  if (filters.drivetrain) { where.push("drivetrain = @drivetrain"); params.drivetrain = filters.drivetrain; }

  // Sort
  let orderBy = "ORDER BY first_seen_at DESC";
  if (filters.sort === "price") orderBy = "ORDER BY price_won ASC NULLS LAST";
  else if (filters.sort === "mileage") orderBy = "ORDER BY mileage_km ASC NULLS LAST";
  else if (filters.sort === "year") orderBy = "ORDER BY first_registration_date DESC NULLS LAST";

  // VIN-unique: keep best row per VIN (richest data wins)
  let sql: string;
  if (filters.vinUnique) {
    sql = `
      SELECT * FROM cars
      WHERE ${where.join(" AND ")}
        AND (vin IS NULL OR car_id IN (
          SELECT car_id FROM cars c2
          WHERE c2.vin = cars.vin
          ORDER BY (has_inspection + has_accident_history + has_diagnosis) DESC,
                   last_fetched_at DESC
          LIMIT 1
        ))
      ${orderBy}
      LIMIT @limit
    `;
  } else {
    sql = `SELECT * FROM cars WHERE ${where.join(" AND ")} ${orderBy} LIMIT @limit`;
  }
  params.limit = filters.limit ?? 100;

  return db().prepare(sql).all(params) as CarRow[];
}

/** Distinct brand keys present in the DB, for dropdowns. */
export function listBrands(): { manufacturer: string; manufacturer_eng: string | null; count: number }[] {
  return db()
    .prepare(
      `SELECT manufacturer, manufacturer_eng, COUNT(*) as count
       FROM cars WHERE manufacturer IS NOT NULL
       GROUP BY manufacturer
       ORDER BY count DESC`,
    )
    .all() as { manufacturer: string; manufacturer_eng: string | null; count: number }[];
}

/** Distinct fuel values present in the DB, for the search-form dropdown. */
export function listFuels(): { fuel: string; count: number }[] {
  return db()
    .prepare(
      `SELECT fuel, COUNT(*) as count FROM cars
       WHERE fuel IS NOT NULL
       GROUP BY fuel ORDER BY count DESC`,
    )
    .all() as { fuel: string; count: number }[];
}

/** Distinct models for a given brand. */
export function listModels(brand: string): { model: string; count: number }[] {
  return db()
    .prepare(
      `SELECT model, COUNT(*) as count FROM cars
       WHERE manufacturer = ? AND model IS NOT NULL
       GROUP BY model ORDER BY count DESC`,
    )
    .all(brand) as { model: string; count: number }[];
}

export interface ParsedCar extends CarRow {
  vehicle: Vehicle | null;
  inspection: InspectionRecord | null;
  accidentHistory: AccidentHistory | null;
  diagnosis: Diagnosis | null;
  duplicates: { car_id: number; first_seen_at: string }[];
}

export function getCar(carId: number): ParsedCar | null {
  const row = db()
    .prepare("SELECT * FROM cars WHERE car_id = ?")
    .get(carId) as CarRowWithBlobs | undefined;
  if (!row) return null;

  const dupes = row.vin
    ? (db()
        .prepare("SELECT car_id, first_seen_at FROM cars WHERE vin = ? AND car_id != ? ORDER BY first_seen_at")
        .all(row.vin, carId) as { car_id: number; first_seen_at: string }[])
    : [];

  const { vehicle_json, inspection_json, accident_history_json, diagnosis_json, ...rest } = row;

  return {
    ...rest,
    vehicle: vehicle_json ? (JSON.parse(vehicle_json) as Vehicle) : null,
    inspection: inspection_json ? (JSON.parse(inspection_json) as InspectionRecord) : null,
    accidentHistory: accident_history_json ? (JSON.parse(accident_history_json) as AccidentHistory) : null,
    diagnosis: diagnosis_json ? (JSON.parse(diagnosis_json) as Diagnosis) : null,
    duplicates: dupes,
  };
}

/**
 * Read from cache; fall back to a live Encar fetch + ingest on miss.
 * Enrichment data is immutable per ModifiedDate, so once cached the row
 * stays valid until the listing is updated upstream (refresh button covers that).
 *
 * Cold-cache fetches go through ENRICH_LIMIT so 20 simultaneous calls from a
 * search-page render don't all hit Encar at once.
 */
export async function getOrFetchCar(carId: number): Promise<ParsedCar | null> {
  const cached = getCar(carId);
  if (cached) return cached;

  // Dynamic imports to keep this module side-effect-free for read-only callers.
  const { fetchFullCar } = await import("../encar/client.js");
  const { ingestCar } = await import("./ingest.js");
  const { ENRICH_LIMIT } = await import("../encar/throttle.js");

  const release = await ENRICH_LIMIT.acquire();
  try {
    // Re-check after acquiring — a sibling waiter may have populated this row.
    const recheck = getCar(carId);
    if (recheck) return recheck;

    const data = await fetchFullCar(carId);
    if (!data.vehicle) return null;
    ingestCar(data);
    return getCar(carId);
  } finally {
    release();
  }
}

export interface CarEnrichment {
  car_id: number;
  vin: string | null;
  has_inspection: boolean;
  has_accident_history: boolean;
  accident_count: number | null;
  total_repair_cost_won: number | null;
  owner_change_count: number | null;
  flood_damage_count: number | null;
  theft_count: number | null;
  total_loss_count: number | null;
  uninsured_periods_count: number | null;
  business_use: boolean;
  government_use: boolean;
  has_water_log: boolean;
  /** True if the underlying detail fetch failed and we have no enrichment to show. */
  unavailable: boolean;
}

/**
 * Compact projection of the enrichment fields used by search-result badges
 * and post-filtering. Backed by getOrFetchCar so first hit fetches + caches,
 * later hits are cheap DB reads.
 */
export async function enrichCarSummary(carId: number): Promise<CarEnrichment> {
  const car = await getOrFetchCar(carId).catch(() => null);
  if (!car) {
    return {
      car_id: carId,
      vin: null,
      has_inspection: false,
      has_accident_history: false,
      accident_count: null,
      total_repair_cost_won: null,
      owner_change_count: null,
      flood_damage_count: null,
      theft_count: null,
      total_loss_count: null,
      uninsured_periods_count: null,
      business_use: false,
      government_use: false,
      has_water_log: false,
      unavailable: true,
    };
  }
  return {
    car_id: car.car_id,
    vin: car.vin,
    has_inspection: !!car.has_inspection,
    has_accident_history: !!car.has_accident_history,
    accident_count: car.accident_count,
    total_repair_cost_won: car.total_repair_cost_won,
    owner_change_count: car.owner_change_count,
    flood_damage_count: car.flood_damage_count,
    theft_count: car.theft_count,
    total_loss_count: car.total_loss_count,
    uninsured_periods_count: car.uninsured_periods_count,
    business_use: !!car.business_use,
    government_use: !!car.government_use,
    has_water_log: !!car.has_water_log,
    unavailable: false,
  };
}

/**
 * Find ingested cars by VIN. Exact (17-char) match first; falls back to a
 * substring LIKE so partial / lowercased input still works. Multiple rows
 * can come back when the same physical car was re-listed (different car_id,
 * same VIN).
 */
export function findCarsByVin(vin: string): CarRow[] {
  const cleaned = vin.trim().toUpperCase();
  if (!cleaned) return [];

  const exact = db()
    .prepare("SELECT * FROM cars WHERE vin = ? ORDER BY last_fetched_at DESC")
    .all(cleaned) as CarRow[];
  if (exact.length > 0) return exact;

  if (cleaned.length < 4) return [];
  return db()
    .prepare("SELECT * FROM cars WHERE vin LIKE ? ORDER BY last_fetched_at DESC LIMIT 20")
    .all(`%${cleaned}%`) as CarRow[];
}

// -------- listing-state checks --------

export type ListingState = "active" | "sold" | "unknown";

/**
 * Ping Encar to verify a cached car is still listed. 404 → 'sold'; 2xx → 'active';
 * other errors → leave the row untouched and return null (we don't know).
 *
 * Always writes last_status_check_at, even when nothing else changed, so the
 * shortlist's "skip if recent" logic actually skips next time.
 */
export async function checkCarStatus(carId: number): Promise<ListingState | null> {
  const { fetchVehicle, EncarHttpError } = await import("../encar/client.js");
  const { ENRICH_LIMIT } = await import("../encar/throttle.js");

  const release = await ENRICH_LIMIT.acquire();
  let state: ListingState | null = null;
  try {
    const vehicle = await fetchVehicle(carId);
    state = vehicle ? "active" : "sold";
  } catch (e) {
    if (e instanceof EncarHttpError && e.status === 404) {
      state = "sold";
    } else {
      // Network blip / 5xx / throttle — caller already has cached data; don't
      // overwrite state on a transient. Leave last_status_check_at unchanged
      // so we'll try again next render.
      return null;
    }
  } finally {
    release();
  }

  const now = new Date().toISOString();
  db()
    .prepare("UPDATE cars SET listing_state = ?, last_status_check_at = ? WHERE car_id = ?")
    .run(state, now, carId);
  return state;
}

/** True when the row hasn't been status-checked within the given window. */
export function isStatusStale(
  lastCheckedAt: string | null,
  maxAgeMs: number,
): boolean {
  if (!lastCheckedAt) return true;
  return Date.now() - new Date(lastCheckedAt).getTime() > maxAgeMs;
}

/** Car IDs whose status hasn't been verified within the given window — for the CLI sweep. */
export function listStaleCars(maxAgeMs: number, limit?: number): number[] {
  const threshold = new Date(Date.now() - maxAgeMs).toISOString();
  const rows = db()
    .prepare(
      `SELECT car_id FROM cars
       WHERE listing_state != 'sold'
         AND (last_status_check_at IS NULL OR last_status_check_at < ?)
       ORDER BY last_status_check_at IS NULL DESC, last_status_check_at ASC
       ${limit ? "LIMIT ?" : ""}`,
    )
    .all(...(limit ? [threshold, limit] : [threshold])) as { car_id: number }[];
  return rows.map((r) => r.car_id);
}

// -------- shortlist --------

export function isInShortlist(carId: number): boolean {
  const row = db().prepare("SELECT 1 FROM shortlist WHERE car_id = ?").get(carId);
  return !!row;
}

export function addToShortlist(carId: number, note?: string): void {
  db()
    .prepare(
      `INSERT INTO shortlist (car_id, note, added_at) VALUES (?, ?, ?)
       ON CONFLICT(car_id) DO UPDATE SET note = excluded.note`,
    )
    .run(carId, note ?? null, new Date().toISOString());
}

export function removeFromShortlist(carId: number): void {
  db().prepare("DELETE FROM shortlist WHERE car_id = ?").run(carId);
}

export function shortlistCount(): number {
  const r = db().prepare("SELECT COUNT(*) as n FROM shortlist").get() as { n: number };
  return r.n;
}

/** All shortlisted cars with their full row + the user's note. */
export function getShortlistedCars(): (CarRow & { note: string | null; added_at: string })[] {
  return db()
    .prepare(
      `SELECT cars.*, shortlist.note, shortlist.added_at
       FROM shortlist
       JOIN cars ON cars.car_id = shortlist.car_id
       ORDER BY shortlist.added_at DESC`,
    )
    .all() as (CarRow & { note: string | null; added_at: string })[];
}

/** Quick stats for the home page. */
export function dbStats(): { total: number; with_inspection: number; with_accident: number; brands: number } {
  const row = db()
    .prepare(
      `SELECT
        COUNT(*) as total,
        SUM(has_inspection) as with_inspection,
        SUM(has_accident_history) as with_accident,
        COUNT(DISTINCT manufacturer) as brands
       FROM cars`,
    )
    .get() as { total: number; with_inspection: number; with_accident: number; brands: number };
  return row;
}
