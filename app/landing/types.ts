/** Featured car shape for the landing page card grid. Mirrors the data the
 *  search-page `CardChrome` renders so both grids look consistent. */
export interface FeaturedCar {
  car_id: number;
  brand_eng: string;
  model_eng: string;
  grade: string | null;
  year: number;
  mileage_km: number;
  /** Raw Korean fuel string (e.g. "디젤"). Translated client-side via the dict. */
  fuel: string;
  /** Raw Korean transmission string. Translated client-side via the dict. */
  transmission: string;
  drivetrain: "2WD" | "4WD" | null;
  power_hp: number | null;
  price_eur: number;
  photo_url: string | null;
}

/** Brand+models option for the hero search dropdowns. */
export interface BrandOption {
  /** Korean key — matches `/search?brand=` expectation. */
  key: string;
  /** English display label. */
  label: string;
  models: { key: string; label: string }[];
}
