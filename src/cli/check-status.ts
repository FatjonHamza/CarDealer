/**
 * CLI: sweep the cached cars table and verify each listing is still on Encar.
 * 404 → mark sold. Otherwise → mark active. Always writes last_status_check_at.
 *
 * Usage:
 *   npm run check-status                       # checks rows older than 7 days
 *   npm run check-status -- --all              # checks every row
 *   npm run check-status -- --max-age-h 24     # custom staleness window
 *   npm run check-status -- --limit 50         # cap how many rows to hit
 */

import { checkCarStatus, listStaleCars } from "../db/queries.js";
import { db } from "../db/index.js";

function parseArgs(argv: string[]): { maxAgeMs: number; limit: number | undefined } {
  let maxAgeH = 7 * 24;
  let limit: number | undefined;
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--all") {
      maxAgeH = 0;
    } else if (a === "--max-age-h" && argv[i + 1]) {
      maxAgeH = Number(argv[++i]);
    } else if (a === "--limit" && argv[i + 1]) {
      limit = Number(argv[++i]);
    }
  }
  return { maxAgeMs: maxAgeH * 60 * 60 * 1000, limit };
}

async function main() {
  const { maxAgeMs, limit } = parseArgs(process.argv.slice(2));
  const carIds = listStaleCars(maxAgeMs, limit);
  if (carIds.length === 0) {
    console.log("Nothing to check — all cached cars verified within the staleness window.");
    return;
  }

  const ageLabel = maxAgeMs === 0 ? "all cars" : `older than ${(maxAgeMs / 3_600_000).toFixed(1)}h`;
  console.log(`Checking ${carIds.length} cached car${carIds.length === 1 ? "" : "s"} (${ageLabel})…`);

  let active = 0;
  let sold = 0;
  let unchanged = 0;
  let errors = 0;

  // checkCarStatus uses ENRICH_LIMIT internally — we can fire them all without
  // worrying about hammering Encar. The semaphore caps real concurrency at 4.
  const results = await Promise.allSettled(
    carIds.map(async (carId) => {
      const prev = db()
        .prepare("SELECT listing_state FROM cars WHERE car_id = ?")
        .get(carId) as { listing_state: string } | undefined;
      const next = await checkCarStatus(carId);
      return { carId, prev: prev?.listing_state, next };
    }),
  );

  for (const r of results) {
    if (r.status === "rejected") {
      errors++;
      continue;
    }
    const { carId, prev, next } = r.value;
    if (next === null) {
      errors++;
      console.log(`  ${carId} — transient, skipped`);
    } else if (next === "sold" && prev !== "sold") {
      sold++;
      console.log(`  ${carId} — newly SOLD`);
    } else if (next === "active") {
      active++;
    } else {
      unchanged++;
    }
  }

  console.log(`\nDone. active=${active} newly-sold=${sold} unchanged=${unchanged} errors=${errors}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
