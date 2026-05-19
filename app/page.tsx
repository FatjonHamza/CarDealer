import Link from "next/link";
import { dbStats, listBrands } from "../src/db/queries.js";

export default function HomePage() {
  const stats = dbStats();
  const brands = listBrands();

  return (
    <div className="grid gap-8">
      <section>
        <h1 className="text-2xl font-bold">Search your local Encar catalog</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          {stats.total} cars ingested across {stats.brands} brands ·{" "}
          {stats.with_inspection} with inspection · {stats.with_accident} with accident history
        </p>
      </section>

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5">
        <form action="/search" method="get" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Brand</span>
            <select name="brand" className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent">
              <option value="">Any</option>
              {brands.map((b) => (
                <option key={b.manufacturer} value={b.manufacturer}>
                  {b.manufacturer_eng ?? b.manufacturer} ({b.count})
                </option>
              ))}
            </select>
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Model contains</span>
            <input
              name="model"
              type="text"
              placeholder="X5, Q7, Tiguan…"
              className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Max price (₩M)</span>
            <input
              name="maxPriceM"
              type="number"
              min="0"
              placeholder="e.g. 70"
              className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Max mileage (km)</span>
            <input
              name="maxMileage"
              type="number"
              min="0"
              step="10000"
              placeholder="e.g. 100000"
              className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Year from</span>
            <input
              name="minYear"
              type="number"
              min="1990"
              max="2026"
              placeholder="e.g. 2018"
              className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Year to</span>
            <input
              name="maxYear"
              type="number"
              min="1990"
              max="2026"
              placeholder="e.g. 2022"
              className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Max accidents</span>
            <input
              name="maxAcc"
              type="number"
              min="0"
              placeholder="e.g. 1"
              className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Max owner changes</span>
            <input
              name="maxOwn"
              type="number"
              min="0"
              placeholder="e.g. 2"
              className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
            />
          </label>
          <label className="grid gap-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Sort by</span>
            <select name="sort" className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent">
              <option value="fresh">Recently added</option>
              <option value="price">Price (low → high)</option>
              <option value="mileage">Mileage (low → high)</option>
              <option value="year">Year (new → old)</option>
            </select>
          </label>
          <label className="grid gap-1 sm:col-span-2 lg:col-span-1">
            <span className="text-xs uppercase tracking-wide text-neutral-500">Options</span>
            <span className="flex gap-3 text-sm pt-1">
              <label className="inline-flex items-center gap-1">
                <input name="vinUnique" type="checkbox" defaultChecked /> Dedupe by VIN
              </label>
              <label className="inline-flex items-center gap-1">
                <input name="noFlood" type="checkbox" defaultChecked /> No flood
              </label>
            </span>
          </label>
          <div className="sm:col-span-2 lg:col-span-4">
            <button
              type="submit"
              className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded font-medium"
            >
              Search
            </button>
          </div>
        </form>
      </section>

      {brands.length === 0 && (
        <section className="text-sm text-neutral-600 dark:text-neutral-400">
          <p>
            No cars in the local DB yet. Run something like{" "}
            <code className="bg-neutral-100 dark:bg-neutral-900 px-1.5 py-0.5 rounded">
              npm run ingest -- --brand BMW --model X5 --pages 5
            </code>{" "}
            to populate it.
          </p>
        </section>
      )}

      <section>
        <h2 className="font-semibold mb-2">Brands in your DB</h2>
        <ul className="text-sm grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-1">
          {brands.map((b) => (
            <li key={b.manufacturer}>
              <Link href={`/search?brand=${encodeURIComponent(b.manufacturer)}`} className="text-blue-600 hover:underline">
                {b.manufacturer_eng ?? b.manufacturer}
              </Link>
              <span className="text-neutral-500"> ({b.count})</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
