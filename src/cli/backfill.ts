/**
 * Backfill recently-added columns (body_type, seat_count, featured_photo_path)
 * from the cached vehicle_json blobs. Idempotent.
 *
 * Usage: npm run backfill
 */

import { db } from "../db/index.js";
import type { InspectionRecord, Vehicle } from "../encar/types.js";
import { modelEnglish } from "../catalog-lookup.js";
import { inferPower } from "../power-lookup.js";
import { inferDrivetrain } from "../drivetrain.js";
import catalog from "../data/catalog.json" with { type: "json" };

interface Row {
  car_id: number;
  vehicle_json: string | null;
  inspection_json: string | null;
}

function brandEng(manufacturerKey: string | undefined | null): string | null {
  if (!manufacturerKey) return null;
  const brands = (catalog as { brands: Record<string, { engName?: string }> }).brands;
  return brands[manufacturerKey]?.engName ?? null;
}

async function main() {
  const d = db();
  const rows = d
    .prepare("SELECT car_id, vehicle_json, inspection_json FROM cars WHERE vehicle_json IS NOT NULL")
    .all() as Row[];

  console.log(`Scanning ${rows.length} rows...`);

  const update = d.prepare(
    `UPDATE cars
     SET body_type = @body_type,
         seat_count = @seat_count,
         featured_photo_path = @featured_photo_path,
         model_eng = @model_eng,
         power_hp = @power_hp,
         power_kw = @power_kw,
         power_source = @power_source,
         drivetrain = @drivetrain
     WHERE car_id = @car_id`,
  );

  let updated = 0;
  let withPower = 0;
  for (const row of rows) {
    if (!row.vehicle_json) continue;
    try {
      const v = JSON.parse(row.vehicle_json) as Vehicle & {
        spec: { bodyName?: string; seatCount?: number };
      };
      const insp = row.inspection_json ? (JSON.parse(row.inspection_json) as InspectionRecord) : null;
      const brandEngName = brandEng(v.category.manufacturerName);
      const power = inferPower(
        brandEngName,
        v.category.gradeName ?? null,
        insp?.master.detail?.motorType ?? null,
      );
      const drivetrain = inferDrivetrain(
        brandEngName,
        v.category.gradeName ?? null,
        v.category.modelName ?? null,
      );
      update.run({
        car_id: row.car_id,
        body_type: v.spec.bodyName ?? null,
        seat_count: v.spec.seatCount ?? null,
        featured_photo_path: v.photos?.[0]?.path ?? null,
        model_eng: modelEnglish(v.category.manufacturerName, v.category.modelName),
        power_hp: power?.hp ?? null,
        power_kw: power?.kw ?? null,
        power_source: power?.source ?? null,
        drivetrain,
      });
      updated++;
      if (power) withPower++;
    } catch (e) {
      console.error(`  car ${row.car_id}: ${(e as Error).message}`);
    }
  }
  console.log(`Updated ${updated} rows. Power resolved for ${withPower}/${updated} (${Math.round((withPower / updated) * 100)}%).`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
