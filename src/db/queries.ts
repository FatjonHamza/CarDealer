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
