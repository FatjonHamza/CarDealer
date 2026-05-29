import catalog from "../src/data/catalog.json" with { type: "json" };
import { liveSearch } from "../src/encar/live-search.js";
import { getKrwPerEur, krwToEur } from "../src/fx.js";
import { LandingClient } from "./landing/Sections";
import type { BrandOption, FeaturedCar } from "./landing/types";

const PHOTO_CDN = "https://ci.encar.com";

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

function buildBrandOptions(): BrandOption[] {
  const brands = catalog.brands as unknown as Record<string, CatalogBrand>;
  return Object.entries(brands)
    .map(([key, info]) => ({
      key,
      label: info.engName ?? info.displayName ?? key,
      count: info.count ?? 0,
      models: Object.entries(info.models ?? {})
        .map(([mKey, m]) => ({
          key: mKey,
          label: m.engName ?? m.displayName ?? mKey,
          count: m.count ?? 0,
        }))
        .sort((a, b) => b.count - a.count)
        .map(({ key, label }) => ({ key, label })),
    }))
    .sort((a, b) => b.count - a.count)
    .map(({ key, label, models }) => ({ key, label, models }));
}

async function loadFeatured(): Promise<{ cars: FeaturedCar[] }> {
  const [search, krwPerEur] = await Promise.all([
    liveSearch({ sort: "fresh", limit: 6, offset: 0 }).catch(() => null),
    getKrwPerEur(),
  ]);
  if (!search) return { cars: [] };
  const cars: FeaturedCar[] = search.rows.map((r) => ({
    car_id: r.car_id,
    brand_eng: r.manufacturer_eng ?? r.manufacturer,
    model_eng: r.model_eng ?? r.model,
    grade: r.grade_english ?? r.grade_name ?? null,
    year: r.year,
    mileage_km: r.mileage_km,
    fuel: r.fuel,
    transmission: r.transmission,
    drivetrain: r.drivetrain,
    power_hp: r.power_hp,
    price_eur: krwToEur(r.price_won, krwPerEur) ?? 0,
    photo_url: r.photo_prefix ? `${PHOTO_CDN}${r.photo_prefix}001.jpg` : null,
  }));
  return { cars };
}

export default async function LandingPage() {
  const brands = buildBrandOptions();
  const { cars } = await loadFeatured();
  return <LandingClient brands={brands} featured={cars} />;
}
