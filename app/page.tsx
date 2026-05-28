import Link from "next/link";
import catalog from "../src/data/catalog.json" with { type: "json" };
import { dbStats } from "../src/db/queries.js";
import { SearchForm, type BrandOption } from "./SearchForm.js";

const FUEL_OPTIONS: { value: string; label: string }[] = [
  { value: "디젤", label: "Diesel" },
  { value: "가솔린", label: "Gasoline" },
  { value: "하이브리드", label: "Hybrid" },
  { value: "전기", label: "Electric" },
  { value: "플러그인하이브리드", label: "Plug-in Hybrid" },
  { value: "LPG", label: "LPG" },
];

interface CatalogModel {
  displayName?: string;
  engName?: string;
  count?: number;
}
interface CatalogBrand {
  displayName?: string;
  engName?: string;
  count?: number;
  models?: Record<string, CatalogModel>;
}

function brandList(): BrandOption[] {
  const brands = catalog.brands as unknown as Record<string, CatalogBrand>;
  return Object.entries(brands)
    .map(([key, info]) => {
      const models = Object.entries(info.models ?? {})
        .map(([modelKey, m]) => ({
          // The search-page filter pipeline runs the value through
          // findModelGroupKey, which already accepts the Korean key directly —
          // so submitting the catalog key is the most reliable round-trip.
          value: modelKey,
          label: m.engName ?? m.displayName ?? modelKey,
          count: m.count ?? 0,
        }))
        .sort((a, b) => b.count - a.count);
      return {
        key,
        display: info.engName ?? key,
        count: info.count ?? 0,
        models,
      };
    })
    .sort((a, b) => b.count - a.count);
}

export default function HomePage() {
  const brands = brandList();
  const stats = dbStats();

  return (
    <div className="grid gap-8">
      <section>
        <h1 className="text-2xl font-bold">Search Encar — live</h1>
        <p className="text-sm text-neutral-600 dark:text-neutral-400 mt-1">
          Every search hits Encar directly. KIDI accident history &amp; inspection load on
          click and are cached locally — {stats.total.toLocaleString()} cars already in cache.
        </p>
      </section>

      <section className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 p-5">
        <SearchForm brands={brands} fuels={FUEL_OPTIONS} />
        <p className="text-xs text-neutral-500 mt-3 leading-relaxed">
          Max accidents / max owners / exclude flood need per-car KIDI data, so cards appear first
          and the filter applies as enrichment streams in. Cached cars filter instantly.
        </p>
      </section>

      <section>
        <h2 className="font-semibold mb-2">Browse by brand</h2>
        <ul className="text-sm grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-x-4 gap-y-1">
          {brands.map((b) => (
            <li key={b.key}>
              <Link href={`/search?brand=${encodeURIComponent(b.key)}`} className="text-blue-600 hover:underline">
                {b.display}
              </Link>
              <span className="text-neutral-500"> ({b.count.toLocaleString()})</span>
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
