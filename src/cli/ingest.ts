/**
 * CLI: ingest cars into SQLite.
 *
 * Single car:
 *   npm run ingest -- --carid 40756868
 *
 * Bulk by search (one or more pages of results matching the query):
 *   npm run ingest -- --brand BMW --model X5 --pages 1
 *   npm run ingest -- --brand 아우디 --model Q7 --pages 3 --limit 20
 *
 * Brand and model keys come from src/data/catalog.json — pass the Korean key
 * for non-English brands (아우디, 폭스바겐, 벤츠).
 */

import { fetchFullCar, searchListings } from "../encar/client.js";
import { and, c, eq } from "../encar/query.js";
import { ingestCar } from "../db/ingest.js";

interface Args {
  carId: number | null;
  brand: string | null;
  model: string | null;
  pages: number;
  limit: number;
  concurrency: number;
}

function parseArgs(argv: string[]): Args {
  const a: Args = { carId: null, brand: null, model: null, pages: 1, limit: 20, concurrency: 4 };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const v = argv[i + 1];
    if (k === "--carid" && v) { a.carId = Number(v); i++; }
    else if (k === "--brand" && v) { a.brand = v; i++; }
    else if (k === "--model" && v) { a.model = v; i++; }
    else if (k === "--pages" && v) { a.pages = Number(v); i++; }
    else if (k === "--limit" && v) { a.limit = Number(v); i++; }
    else if (k === "--concurrency" && v) { a.concurrency = Number(v); i++; }
  }
  return a;
}

async function ingestById(carId: number): Promise<void> {
  const data = await fetchFullCar(carId);
  const { inserted } = ingestCar(data);
  const v = data.vehicle;
  const summary = v
    ? `${v.category.manufacturerName} ${v.category.modelName} — ${v.category.gradeName}  ₩${(v.advertisement.price * 10000).toLocaleString()}`
    : "(no vehicle data)";
  console.log(`  ${inserted ? "+" : "~"} ${carId}  ${summary}`);
}

async function poolMap<T>(items: T[], n: number, fn: (t: T) => Promise<void>) {
  let idx = 0;
  const workers = Array.from({ length: n }, async () => {
    while (idx < items.length) {
      const my = idx++;
      const item = items[my];
      if (item === undefined) continue;
      try { await fn(item); } catch (e) {
        console.log(`  ! ${item} failed: ${(e as Error).message}`);
      }
    }
  });
  await Promise.all(workers);
}

async function ingestSearch(brand: string, model: string, pages: number, limit: number, concurrency: number) {
  const q = and(eq("Hidden", "N"), c(eq("CarType", "N"), c(eq("Manufacturer", brand), eq("ModelGroup", model))));
  console.log(`Searching: ${brand} / ${model}, ${pages} page(s) × ${limit} = up to ${pages * limit} cars`);

  const allCarIds: number[] = [];
  for (let p = 0; p < pages; p++) {
    const res = await searchListings(q, { offset: p * limit, limit });
    if (p === 0) console.log(`Total matches: ${res.Count}`);
    for (const item of res.SearchResults) allCarIds.push(Number(item.Id));
    if (res.SearchResults.length < limit) break;
  }
  console.log(`Fetching full data for ${allCarIds.length} cars with concurrency=${concurrency}...`);
  const t0 = Date.now();
  await poolMap(allCarIds, concurrency, ingestById);
  console.log(`Done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.carId) {
    await ingestById(args.carId);
    return;
  }
  if (args.brand && args.model) {
    await ingestSearch(args.brand, args.model, args.pages, args.limit, args.concurrency);
    return;
  }
  console.error(
    "Usage:\n  npm run ingest -- --carid <id>\n  npm run ingest -- --brand <key> --model <key> [--pages N] [--limit N] [--concurrency N]",
  );
  process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
