import { Suspense } from "react";
import Link from "next/link";
import catalog from "../../src/data/catalog.json" with { type: "json" };
import { liveSearch, type LiveSearchFilters } from "../../src/encar/live-search.js";
import { getKrwPerEur } from "../../src/fx.js";
import { CardChrome } from "./CardChrome.js";
import { SearchForm, type BrandOption, type InitialFilters } from "../SearchForm.js";

const PAGE_SIZE = 20;

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

interface SearchPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

function pickStr(v: string | string[] | undefined): string | undefined {
  if (Array.isArray(v)) return v[0];
  return v;
}

function pickNum(v: string | string[] | undefined): number | undefined {
  const s = pickStr(v);
  if (!s) return undefined;
  const n = Number(s);
  return Number.isFinite(n) ? n : undefined;
}

interface ParsedParams {
  filters: LiveSearchFilters;
  page: number;
  rawParams: Record<string, string | string[] | undefined>;
}

function parse(sp: Record<string, string | string[] | undefined>): ParsedParams {
  const page = Math.max(1, pickNum(sp.page) ?? 1);
  const filters: LiveSearchFilters = {
    brand: pickStr(sp.brand),
    model: pickStr(sp.model),
    maxPriceMan: pickNum(sp.maxPriceM) ? pickNum(sp.maxPriceM)! * 100 : undefined,
    maxMileageKm: pickNum(sp.maxMileage),
    minYear: pickNum(sp.minYear),
    maxYear: pickNum(sp.maxYear),
    fuel: pickStr(sp.fuel) || undefined,
    sort: (pickStr(sp.sort) as LiveSearchFilters["sort"]) ?? "fresh",
    limit: PAGE_SIZE,
    offset: (page - 1) * PAGE_SIZE,
  };
  return { filters, page, rawParams: sp };
}

/**
 * Builds an `/search?...` query string preserving all current params except
 * `page`, which is overridden. Used for Prev/Next links.
 */
function buildPageHref(sp: Record<string, string | string[] | undefined>, page: number): string {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(sp)) {
    if (k === "page") continue;
    const val = Array.isArray(v) ? v[0] : v;
    if (val == null || val === "") continue;
    qs.set(k, val);
  }
  qs.set("page", String(page));
  return `/search?${qs.toString()}`;
}

function initialFromParams(sp: Record<string, string | string[] | undefined>): InitialFilters {
  return {
    brand: pickStr(sp.brand),
    model: pickStr(sp.model),
    maxPriceM: pickStr(sp.maxPriceM),
    maxMileage: pickStr(sp.maxMileage),
    minYear: pickStr(sp.minYear),
    maxYear: pickStr(sp.maxYear),
    fuel: pickStr(sp.fuel),
    sort: pickStr(sp.sort),
  };
}

function filterSummary(initial: InitialFilters, brands: BrandOption[]): string {
  const parts: string[] = [];
  if (initial.brand) {
    const b = brands.find((br) => br.key === initial.brand);
    parts.push(b?.display ?? initial.brand);
  }
  if (initial.model) {
    const b = brands.find((br) => br.key === initial.brand);
    const m = b?.models.find((mm) => mm.value === initial.model);
    parts.push(m?.label ?? initial.model);
  }
  if (initial.minYear || initial.maxYear) {
    parts.push(`${initial.minYear ?? "—"}–${initial.maxYear ?? "—"}`);
  }
  if (initial.maxPriceM) parts.push(`≤ ₩${initial.maxPriceM}M`);
  if (initial.maxMileage) parts.push(`≤ ${Number(initial.maxMileage).toLocaleString()} km`);
  if (initial.fuel) parts.push(String(initial.fuel));
  return parts.length > 0 ? parts.join(" · ") : "no filters";
}

async function SearchResults({
  params,
}: {
  params: ParsedParams;
}) {
  const { filters, page, rawParams } = params;

  const [searchResult, krwPerEur] = await Promise.all([
    liveSearch(filters).catch((e: unknown) => {
      return { error: (e as Error).message || "Encar search failed" } as const;
    }),
    getKrwPerEur(),
  ]);

  if ("error" in searchResult) {
    return (
      <div className="text-sm bg-rose-50 dark:bg-rose-950/30 text-rose-900 dark:text-rose-200 border border-rose-200 dark:border-rose-900 px-3 py-3 rounded">
        <strong className="font-semibold">Encar rate-limited us.</strong> {searchResult.error}
      </div>
    );
  }

  const { rows, totalCount } = searchResult;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const hasPrev = page > 1;
  const hasNext = page < totalPages && rows.length === PAGE_SIZE;

  return (
    <>
      <div>
        <h2 className="text-xl font-semibold">
          {totalCount.toLocaleString()} live result{totalCount === 1 ? "" : "s"}
          {totalPages > 1 && (
            <span className="text-base font-normal text-neutral-500 ml-2">
              · page {page} of {totalPages}
            </span>
          )}
        </h2>
        <p className="text-xs text-neutral-500 mt-0.5">
          Showing {rows.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{(page - 1) * PAGE_SIZE + rows.length}.
        </p>
      </div>

      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 mt-4">
        {rows.map((row) => (
          <CardChrome key={row.car_id} listing={row} krwPerEur={krwPerEur} />
        ))}
      </ul>

      {rows.length === 0 && (
        <div className="text-sm text-neutral-600 dark:text-neutral-400 py-12 text-center">
          No matches on Encar for these filters. Loosen them and try again.
        </div>
      )}

      {(hasPrev || hasNext) && (
        <nav className="flex items-center justify-between gap-3 mt-6 pt-4 border-t border-neutral-200 dark:border-neutral-800">
          {hasPrev ? (
            <Link
              href={buildPageHref(rawParams, page - 1)}
              className="text-sm px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              ← Previous
            </Link>
          ) : (
            <span className="text-sm px-3 py-2 rounded border border-neutral-200 dark:border-neutral-900 text-neutral-400">
              ← Previous
            </span>
          )}
          <span className="text-xs text-neutral-500">
            Page {page} of {totalPages}
          </span>
          {hasNext ? (
            <Link
              href={buildPageHref(rawParams, page + 1)}
              className="text-sm px-3 py-2 rounded border border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-900"
            >
              Next →
            </Link>
          ) : (
            <span className="text-sm px-3 py-2 rounded border border-neutral-200 dark:border-neutral-900 text-neutral-400">
              Next →
            </span>
          )}
        </nav>
      )}
    </>
  );
}

function SearchPending() {
  return (
    <div className="flex items-center gap-3 py-12 text-sm text-neutral-500">
      <span className="inline-block w-4 h-4 rounded-full border-2 border-neutral-300 border-t-neutral-600 animate-spin" />
      Searching Encar…
    </div>
  );
}

export default async function SearchPage({ searchParams }: SearchPageProps) {
  const sp = await searchParams;
  const params = parse(sp);
  const brands = brandList();
  const initial = initialFromParams(sp);
  const summary = filterSummary(initial, brands);

  return (
    <div className="mx-auto grid max-w-7xl gap-4 px-4 py-10 sm:px-6">
      <details className="rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-950 group">
        <summary className="cursor-pointer p-4 flex items-center justify-between gap-3 select-none">
          <div className="flex items-baseline gap-3 flex-wrap min-w-0">
            <span className="font-semibold">Filters</span>
            <span className="text-sm text-neutral-500 truncate">{summary}</span>
          </div>
          <span className="text-xs text-neutral-400 group-open:hidden">Edit ▾</span>
          <span className="text-xs text-neutral-400 hidden group-open:inline">Collapse ▴</span>
        </summary>
        <div className="px-4 pb-4 border-t border-neutral-100 dark:border-neutral-900 pt-4">
          <SearchForm brands={brands} fuels={FUEL_OPTIONS} initial={initial} />
        </div>
      </details>

      <Suspense fallback={<SearchPending />}>
        <SearchResults params={params} />
      </Suspense>
    </div>
  );
}
