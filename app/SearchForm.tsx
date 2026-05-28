"use client";

import { useMemo, useState } from "react";

export interface BrandOption {
  key: string;
  display: string;
  count: number;
  models: { value: string; label: string; count: number }[];
}

interface FuelOption {
  value: string;
  label: string;
}

export interface InitialFilters {
  brand?: string;
  model?: string;
  maxPriceM?: number | string;
  maxMileage?: number | string;
  minYear?: number | string;
  maxYear?: number | string;
  fuel?: string;
  sort?: string;
}

interface Props {
  brands: BrandOption[];
  fuels: FuelOption[];
  initial?: InitialFilters;
}

const CURRENT_YEAR = new Date().getFullYear();
const YEARS: number[] = [];
for (let y = CURRENT_YEAR; y >= 1995; y--) YEARS.push(y);

export function SearchForm({ brands, fuels, initial = {} }: Props) {
  const [brandKey, setBrandKey] = useState(initial.brand ?? "");
  const [model, setModel] = useState(initial.model ?? "");

  const models = useMemo(() => {
    const b = brands.find((br) => br.key === brandKey);
    return b ? b.models : [];
  }, [brandKey, brands]);

  // Reset model when brand changes so the form doesn't submit a stale model
  // value from a different brand's list.
  function onBrandChange(next: string) {
    setBrandKey(next);
    setModel("");
  }

  return (
    <form action="/search" method="get" className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
      <label className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-neutral-500">Brand</span>
        <select
          name="brand"
          value={brandKey}
          onChange={(e) => onBrandChange(e.target.value)}
          className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
        >
          <option value="">Any</option>
          {brands.map((b) => (
            <option key={b.key} value={b.key}>
              {b.display}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-neutral-500">Model</span>
        <select
          name="model"
          value={model}
          onChange={(e) => setModel(e.target.value)}
          disabled={!brandKey}
          className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <option value="">{brandKey ? "Any model" : "Pick a brand first"}</option>
          {models.map((m) => (
            <option key={m.value} value={m.value}>
              {m.label}
              {m.count ? ` (${m.count.toLocaleString()})` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-neutral-500">Max price (₩M)</span>
        <input
          name="maxPriceM"
          type="number"
          min="0"
          placeholder="e.g. 70"
          defaultValue={initial.maxPriceM ?? ""}
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
          defaultValue={initial.maxMileage ?? ""}
          className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
        />
      </label>
      <label className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-neutral-500">Year from</span>
        <select
          name="minYear"
          defaultValue={initial.minYear ?? ""}
          className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
        >
          <option value="">Any</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-neutral-500">Year to</span>
        <select
          name="maxYear"
          defaultValue={initial.maxYear ?? ""}
          className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
        >
          <option value="">Any</option>
          {YEARS.map((y) => (
            <option key={y} value={y}>
              {y}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-neutral-500">Fuel</span>
        <select
          name="fuel"
          defaultValue={initial.fuel ?? ""}
          className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
        >
          <option value="">Any</option>
          {fuels.map((f) => (
            <option key={f.value} value={f.value}>
              {f.label}
            </option>
          ))}
        </select>
      </label>
      <label className="grid gap-1">
        <span className="text-xs uppercase tracking-wide text-neutral-500">Sort by</span>
        <select
          name="sort"
          defaultValue={initial.sort ?? "fresh"}
          className="px-2 py-1.5 rounded border border-neutral-300 dark:border-neutral-700 bg-transparent"
        >
          <option value="fresh">Recently listed</option>
          <option value="price">Price (low → high)</option>
          <option value="mileage">Mileage (low → high)</option>
          <option value="year">Year (new → old)</option>
        </select>
      </label>
      <div className="sm:col-span-2 lg:col-span-4">
        <button
          type="submit"
          className="bg-black text-white dark:bg-white dark:text-black px-4 py-2 rounded font-medium"
        >
          Search Encar
        </button>
      </div>
    </form>
  );
}
