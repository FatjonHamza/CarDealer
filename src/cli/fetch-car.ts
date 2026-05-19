/**
 * CLI: pull all data for one car by carid and print it.
 *
 * Usage:
 *   npm run fetch -- --carid 40756868
 *   npm run fetch -- --carid 40756868 --json     # raw JSON instead of summary
 *   npm run fetch -- --carid 40756868 --out car.json
 */

import { writeFile } from "node:fs/promises";
import { fetchFullCar } from "../encar/client.js";
import type { FullCarData } from "../encar/types.js";
import { tt } from "../i18n.js";

function parseArgs(argv: string[]): {
  carId: number | null;
  json: boolean;
  out: string | null;
} {
  let carId: number | null = null;
  let json = false;
  let out: string | null = null;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--carid" && argv[i + 1]) {
      carId = Number(argv[++i]);
    } else if (a === "--json") {
      json = true;
    } else if (a === "--out" && argv[i + 1]) {
      out = argv[++i] ?? null;
    }
  }
  return { carId, json, out };
}

const KRW_PER_EUR = 1400;

function summarize(data: FullCarData): void {
  const { vehicle, inspection, accidentHistory, diagnosis } = data;

  console.log(`\n=== Car ${data.carId} ===`);

  if (vehicle) {
    const cat = vehicle.category;
    const spec = vehicle.spec;
    const ad = vehicle.advertisement;
    const priceWon = ad.price * 10_000;
    const eur = Math.round(priceWon / KRW_PER_EUR);
    console.log(`Plate: ${vehicle.vehicleNo}    VIN: ${vehicle.vin}`);
    console.log(
      `\nVehicle: ${cat.manufacturerName} ${cat.modelName} — ${cat.gradeName}`,
    );
    if (cat.gradeEnglishName) console.log(`  (English: ${cat.gradeEnglishName})`);
    console.log(`  Mileage:    ${spec.mileage.toLocaleString()} km`);
    console.log(
      `  Engine:     ${spec.displacement} cc, ${tt(spec.fuelName, "fuel")}, ${tt(spec.transmissionName, "transmission")}`,
    );
    if (spec.colorName) console.log(`  Color:      ${tt(spec.colorName, "color")}`);
    console.log(
      `  Price:      ₩${priceWon.toLocaleString()}  (≈ €${eur.toLocaleString()})`,
    );
    console.log(`  Status:     ${ad.status} / ${ad.salesStatus ?? "?"}`);
    if (ad.oneLineText) console.log(`  Tagline:    ${ad.oneLineText}`);
    console.log(`  Photos:     ${vehicle.photos.length}`);
    console.log(`  First ad:   ${vehicle.manage.firstAdvertisedDateTime?.slice(0, 10) ?? "?"}`);
    console.log(`  Subscribed: ${vehicle.manage.subscribeCount ?? 0}`);
  } else {
    console.log("\nVehicle: not found");
  }

  if (inspection) {
    const d = inspection.master.detail;
    console.log(`\nInspection (성능점검기록부 #${inspection.master.supplyNum}):`);
    console.log(
      `  Accident:    ${inspection.master.accdient ? "YES" : "no"}   Simple repair: ${inspection.master.simpleRepair ? "YES" : "no"}`,
    );
    if (d) {
      console.log(`  First reg:   ${d.firstRegistrationDate}`);
      console.log(`  Engine code: ${d.motorType}`);
      console.log(`  Water log:   ${d.waterlog ? "⚠️  YES" : "no"}`);
      console.log(`  Tuning:      ${d.tuning ? "yes" : "no"}`);
      console.log(
        `  Recall:      ${d.recall ? `yes — ${d.recallFullFillTypes.map((r) => tt(r.title, "recall")).join(", ")}` : "no"}`,
      );
      if (d.paintPartTypes.length) {
        console.log(`  Repainted:   ${d.paintPartTypes.map((p) => tt(p.title)).join(", ")}`);
      }
      if (d.comments) {
        console.log(`  Notes:       ${d.comments.replace(/\s+/g, " ").slice(0, 200)}...`);
      }
    } else {
      console.log(`  (detail not posted by dealer)`);
    }
  } else {
    console.log("\nInspection: not available");
  }

  if (accidentHistory) {
    const a = accidentHistory;
    console.log(`\nAccident history (from KIDI / 카히스토리):`);
    console.log(`  Total accidents:    ${a.accidentCnt} (self: ${a.myAccidentCnt}, other: ${a.otherAccidentCnt})`);
    console.log(`  Total repair cost:  ₩${a.myAccidentCost.toLocaleString()}`);
    console.log(`  Owner changes:      ${a.ownerChangeCnt}`);
    console.log(`  Plate changes:      ${a.carNoChangeCnt}`);
    console.log(`  Flood damage:       ${a.floodTotalLossCnt + (a.floodPartLossCnt ?? 0)}`);
    console.log(`  Theft:              ${a.robberCnt}`);
    console.log(`  Total loss:         ${a.totalLossCnt}`);
    const uninsured = [a.notJoinDate1, a.notJoinDate2, a.notJoinDate3, a.notJoinDate4, a.notJoinDate5].filter(Boolean);
    if (uninsured.length) console.log(`  Uninsured periods:  ${uninsured.join(", ")}  ⚠️`);
    if (a.business) console.log(`  ⚠️  Business use flag set`);
    if (a.government) console.log(`  ⚠️  Government use flag set`);
    if (a.loan) console.log(`  ℹ️  Loan/financing flag set`);
    if (a.accidents.length) {
      console.log(`  Individual events:`);
      for (const ev of a.accidents) {
        const total = ev.partCost + ev.laborCost + ev.paintingCost;
        const typeLabel = tt(ev.type, "accidentType");
        console.log(
          `    ${ev.date}  ${typeLabel}  insurance=₩${ev.insuranceBenefit.toLocaleString()}  repair=₩${total.toLocaleString()}`,
        );
      }
    }
  } else {
    console.log("\nAccident history: not available");
  }

  if (diagnosis) {
    const verdict = diagnosis.items.find((i) => i.name === "CHECKER_COMMENT");
    console.log(`\nEncar diagnosis (#${diagnosis.diagnosisNo}):`);
    console.log(`  Date:    ${diagnosis.diagnosisDate.slice(0, 10)}`);
    console.log(`  Center:  ${diagnosis.reservationCenterName}`);
    if (verdict?.result) {
      console.log(`  Verdict: ${verdict.result.slice(0, 160)}`);
    }
    const panels = diagnosis.items.filter((i) => i.resultCode);
    if (panels.length) {
      const bad = panels.filter((i) => i.resultCode !== "NORMAL");
      console.log(
        `  Panels:  ${panels.length} inspected, ${bad.length} flagged${bad.length ? " — " + bad.map((b) => `${b.name}=${b.resultCode}`).join(", ") : ""}`,
      );
    }
  } else {
    console.log("\nDiagnosis: not available");
  }

  console.log();
}

async function main() {
  const { carId, json, out } = parseArgs(process.argv.slice(2));
  if (!carId) {
    console.error("Usage: npm run fetch -- --carid <id> [--json] [--out file.json]");
    process.exit(1);
  }

  const data = await fetchFullCar(carId);

  if (json || out) {
    const text = JSON.stringify(data, null, 2);
    if (out) {
      await writeFile(out, text);
      console.log(`Wrote ${out}`);
    } else {
      console.log(text);
    }
  } else {
    summarize(data);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
