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

// Featured carousel pulls from the three German premium brands KAK actually
// imports. Keys are Encar's Korean Manufacturer strings.
const FEATURED_BRANDS = ["BMW", "벤츠", "아우디"] as const;
const FEATURED_PER_BRAND = 2;

async function loadFeatured(): Promise<{ cars: FeaturedCar[] }> {
  const [krwPerEur, ...perBrand] = await Promise.all([
    getKrwPerEur(),
    ...FEATURED_BRANDS.map((brand) =>
      liveSearch({ brand, sort: "fresh", limit: FEATURED_PER_BRAND, offset: 0 }).catch(() => null),
    ),
  ]);

  // Interleave brand-by-brand so the carousel rotates Audi/BMW/Mercedes instead
  // of grouping by brand.
  const cars: FeaturedCar[] = [];
  for (let i = 0; i < FEATURED_PER_BRAND; i++) {
    for (const res of perBrand) {
      const r = res?.rows[i];
      if (!r) continue;
      cars.push({
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
      });
    }
  }
  return { cars };
}

export default async function LandingPage() {
  const brands = buildBrandOptions();
  const { cars } = await loadFeatured();
  return <LandingClient brands={brands} featured={cars} />;
}
