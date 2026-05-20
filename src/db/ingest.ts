/**
 * Map a FullCarData into a SQL row and upsert into the `cars` table.
 * Preserves first_seen_at on update, always refreshes last_fetched_at.
 */

import { db } from "./index.js";
import type { FullCarData, Vehicle } from "../encar/types.js";
import catalog from "../data/catalog.json" with { type: "json" };
import { modelEnglish } from "../catalog-lookup.js";
import { inferPower } from "../power-lookup.js";
import { inferDrivetrain } from "../drivetrain.js";
import { pickFeaturedPhoto } from "../photo.js";

type Cat = typeof catalog;

function bool(v: boolean | undefined | null): number {
  return v ? 1 : 0;
}

function countUninsured(a: NonNullable<FullCarData["accidentHistory"]>): number {
  return [a.notJoinDate1, a.notJoinDate2, a.notJoinDate3, a.notJoinDate4, a.notJoinDate5]
    .filter(Boolean).length;
}

function brandEngName(manufacturer: string | undefined): string | null {
  if (!manufacturer) return null;
  const brands = (catalog as Cat).brands as Record<string, { engName?: string }>;
  return brands[manufacturer]?.engName ?? null;
}

function vehicleColumns(v: Vehicle | null) {
  if (!v) return {};
  const cat = v.category;
  const spec = v.spec;
  const ad = v.advertisement;
  const featured = pickFeaturedPhoto(v.photos)?.path ?? null;
  return {
    vehicle_no: v.vehicleNo,
    vin: v.vin,
    manufacturer: cat.manufacturerName,
    manufacturer_eng: brandEngName(cat.manufacturerName),
    model: cat.modelName,
    model_eng: modelEnglish(cat.manufacturerName, cat.modelName),
    grade_name: cat.gradeName,
    grade_english: cat.gradeEnglishName ?? null,
    mileage_km: spec.mileage,
    displacement_cc: spec.displacement,
    fuel: spec.fuelName,
    transmission: spec.transmissionName,
    color: spec.colorName ?? null,
    body_type: (spec as { bodyName?: string }).bodyName ?? null,
    seat_count: (spec as { seatCount?: number }).seatCount ?? null,
    featured_photo_path: featured,
    price_won: ad.price * 10_000,
    status: ad.status,
    one_line_text: ad.oneLineText ?? null,
    first_ad_date: v.manage.firstAdvertisedDateTime ?? null,
    modify_date: v.manage.modifyDateTime ?? null,
  };
}

function inspectionColumns(i: FullCarData["inspection"]) {
  if (!i) return {};
  const d = i.master.detail;
  // master may exist without detail filled in (partially prepared listing).
  if (!d) {
    return {
      inspector_says_accident: bool(i.master.accdient),
      inspection_supply_num: i.master.supplyNum,
    };
  }
  return {
    first_registration_date: d.firstRegistrationDate,
    motor_type: d.motorType,
    has_water_log: bool(d.waterlog),
    has_tuning: bool(d.tuning),
    recall_completed: d.recall ? bool(d.recallFullFillTypes.some((r) => r.title === "이행")) : 0,
    inspector_says_accident: bool(i.master.accdient),
    inspection_comments: d.comments ?? null,
    inspection_supply_num: i.master.supplyNum,
  };
}

function accidentColumns(a: FullCarData["accidentHistory"]) {
  if (!a) return {};
  return {
    accident_count: a.accidentCnt,
    self_accident_count: a.myAccidentCnt,
    other_accident_count: a.otherAccidentCnt,
    total_repair_cost_won: a.myAccidentCost,
    owner_change_count: a.ownerChangeCnt,
    plate_change_count: a.carNoChangeCnt,
    flood_damage_count: a.floodTotalLossCnt + (a.floodPartLossCnt ?? 0),
    theft_count: a.robberCnt,
    total_loss_count: a.totalLossCnt,
    uninsured_periods_count: countUninsured(a),
    business_use: a.business ? 1 : 0,
    government_use: a.government ? 1 : 0,
    loan_flag: a.loan ? 1 : 0,
  };
}

const COLS = [
  "car_id",
  "vehicle_no",
  "vin",
  "manufacturer",
  "manufacturer_eng",
  "model",
  "model_eng",
  "grade_name",
  "grade_english",
  "mileage_km",
  "displacement_cc",
  "power_hp",
  "power_kw",
  "power_source",
  "drivetrain",
  "fuel",
  "transmission",
  "color",
  "body_type",
  "seat_count",
  "featured_photo_path",
  "price_won",
  "status",
  "one_line_text",
  "first_registration_date",
  "motor_type",
  "has_water_log",
  "has_tuning",
  "recall_completed",
  "inspector_says_accident",
  "inspection_comments",
  "inspection_supply_num",
  "accident_count",
  "self_accident_count",
  "other_accident_count",
  "total_repair_cost_won",
  "owner_change_count",
  "plate_change_count",
  "flood_damage_count",
  "theft_count",
  "total_loss_count",
  "uninsured_periods_count",
  "business_use",
  "government_use",
  "loan_flag",
  "has_vehicle",
  "has_inspection",
  "has_accident_history",
  "has_diagnosis",
  "vehicle_json",
  "inspection_json",
  "accident_history_json",
  "diagnosis_json",
  "first_ad_date",
  "modify_date",
  "first_seen_at",
  "last_fetched_at",
] as const;

type Col = (typeof COLS)[number];

export function ingestCar(data: FullCarData): { inserted: boolean; carId: number } {
  const now = new Date().toISOString();

  const power = inferPower(
    brandEngName(data.vehicle?.category.manufacturerName),
    data.vehicle?.category.gradeName ?? null,
    data.inspection?.master.detail?.motorType ?? null,
  );
  const drivetrain = inferDrivetrain(
    brandEngName(data.vehicle?.category.manufacturerName),
    data.vehicle?.category.gradeName ?? null,
    data.vehicle?.category.modelName ?? null,
  );

  const row: Partial<Record<Col, unknown>> = {
    car_id: data.carId,
    ...vehicleColumns(data.vehicle),
    ...inspectionColumns(data.inspection),
    ...accidentColumns(data.accidentHistory),
    power_hp: power?.hp ?? null,
    power_kw: power?.kw ?? null,
    power_source: power?.source ?? null,
    drivetrain,
    has_vehicle: bool(!!data.vehicle),
    has_inspection: bool(!!data.inspection),
    has_accident_history: bool(!!data.accidentHistory),
    has_diagnosis: bool(!!data.diagnosis),
    vehicle_json: data.vehicle ? JSON.stringify(data.vehicle) : null,
    inspection_json: data.inspection ? JSON.stringify(data.inspection) : null,
    accident_history_json: data.accidentHistory ? JSON.stringify(data.accidentHistory) : null,
    diagnosis_json: data.diagnosis ? JSON.stringify(data.diagnosis) : null,
    last_fetched_at: now,
  };

  const d = db();
  // Check if existing — to preserve first_seen_at
  const existing = d
    .prepare("SELECT car_id FROM cars WHERE car_id = ?")
    .get(data.carId) as { car_id: number } | undefined;

  if (!existing) {
    row.first_seen_at = now;
    const cols = COLS.filter((c) => c in row).join(", ");
    const placeholders = COLS.filter((c) => c in row).map((c) => `@${c}`).join(", ");
    d.prepare(`INSERT INTO cars (${cols}) VALUES (${placeholders})`).run(row);
    return { inserted: true, carId: data.carId };
  }

  // Update — but skip first_seen_at
  const updatable = COLS.filter((c) => c !== "car_id" && c !== "first_seen_at" && c in row);
  const setClause = updatable.map((c) => `${c} = @${c}`).join(", ");
  d.prepare(`UPDATE cars SET ${setClause} WHERE car_id = @car_id`).run(row);
  return { inserted: false, carId: data.carId };
}
