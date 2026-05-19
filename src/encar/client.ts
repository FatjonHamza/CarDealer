/**
 * Plain HTTP client for Encar's JSON API. No Playwright needed in the hot path —
 * `api.encar.com` responds to standard fetch requests with the right Referer.
 */

import type {
  AccidentHistory,
  Diagnosis,
  FullCarData,
  InspectionRecord,
  SearchResponse,
  Vehicle,
  VerificationResponse,
} from "./types.js";
import { render, type Expr } from "./query.js";

const API_BASE = "https://api.encar.com";
const WEB_BASE = "http://www.encar.com";

const HEADERS: Record<string, string> = {
  Accept: "application/json",
  "Accept-Language": "ko-KR,ko;q=0.9,en;q=0.8",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: `${WEB_BASE}/`,
  Origin: WEB_BASE,
};

class EncarHttpError extends Error {
  constructor(
    public url: string,
    public status: number,
    public statusText: string,
  ) {
    super(`Encar ${status} ${statusText} for ${url}`);
  }
}

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url, { headers: HEADERS });
  if (!res.ok) throw new EncarHttpError(url, res.status, res.statusText);
  return (await res.json()) as T;
}

/**
 * Encar's CloudFront throttles us under bot-detection load. Initially returns
 * 407 on /search/*; if we keep hitting it, escalates to dropping connections
 * entirely (`TypeError: fetch failed` from undici). Retry both cases.
 */
function isRetryable(e: unknown): boolean {
  if (e instanceof EncarHttpError) {
    return e.status === 407 || e.status === 429 || e.status >= 500;
  }
  // undici network errors come through as TypeError("fetch failed")
  if (e instanceof TypeError && /fetch failed/i.test(e.message)) return true;
  return false;
}

async function getJsonWithRetry<T>(url: string, maxAttempts = 4): Promise<T> {
  let lastErr: unknown;
  const backoffsMs = [0, 15_000, 60_000, 180_000];
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const delay = backoffsMs[attempt] ?? 180_000;
    if (delay > 0) {
      console.error(`  Encar transient error — backing off ${delay / 1000}s (attempt ${attempt}/${maxAttempts - 1})`);
      await new Promise((r) => setTimeout(r, delay));
    }
    try {
      return await getJson<T>(url);
    } catch (e) {
      lastErr = e;
      if (!isRetryable(e)) throw e;
    }
  }
  throw lastErr;
}

export interface SearchOptions {
  sort?: "ModifiedDate" | "Price" | "Mileage" | "Year";
  offset?: number;
  limit?: number;
}

export async function searchListings(
  query: Expr | string,
  opts: SearchOptions = {},
): Promise<SearchResponse> {
  const { sort = "ModifiedDate", offset = 0, limit = 20 } = opts;
  const q = typeof query === "string" ? query : render(query);
  const sr = `|${sort}|${offset}|${limit}`;
  const url = `${API_BASE}/search/car/list/premium?count=true&q=${encodeURIComponent(q)}&sr=${encodeURIComponent(sr)}`;
  // Search is the path CloudFront throttles. Use the retry wrapper.
  return getJsonWithRetry<SearchResponse>(url);
}

export async function fetchInspection(carId: number): Promise<InspectionRecord> {
  return getJsonWithRetry<InspectionRecord>(
    `${API_BASE}/v1/readside/inspection/vehicle/${carId}`,
  );
}

export async function fetchDiagnosis(carId: number): Promise<Diagnosis | null> {
  try {
    return await getJsonWithRetry<Diagnosis>(
      `${API_BASE}/v1/readside/diagnosis/vehicle/${carId}`,
    );
  } catch (e) {
    if (e instanceof EncarHttpError && e.status === 404) return null;
    throw e;
  }
}

export async function fetchAccidentHistory(
  carId: number,
  vehicleNo: string,
): Promise<AccidentHistory | null> {
  try {
    return await getJsonWithRetry<AccidentHistory>(
      `${API_BASE}/v1/readside/record/vehicle/${carId}/open?vehicleNo=${encodeURIComponent(vehicleNo)}`,
    );
  } catch (e) {
    if (e instanceof EncarHttpError && (e.status === 404 || e.status === 400)) {
      return null;
    }
    throw e;
  }
}

export async function fetchVerification(
  carId: number,
  optionIds: number[],
): Promise<VerificationResponse> {
  const ids = optionIds.join(",");
  return getJsonWithRetry<VerificationResponse>(
    `${API_BASE}/verification/${carId}/simple?optionIds=${ids}`,
  );
}

/**
 * Canonical per-car endpoint. Returns plate, VIN, dealer, spec, photos, options,
 * accident/inspection summaries. Use this instead of search-by-id.
 */
export async function fetchVehicle(carId: number): Promise<Vehicle | null> {
  try {
    return await getJsonWithRetry<Vehicle>(`${API_BASE}/v1/readside/vehicle/${carId}`);
  } catch (e) {
    if (e instanceof EncarHttpError && e.status === 404) return null;
    throw e;
  }
}

/**
 * Pulls every piece of data we know how to fetch for a single car, in parallel.
 * Tolerant: any single failure becomes a null field, the rest still returns.
 */
export async function fetchFullCar(carId: number): Promise<FullCarData> {
  const [vehicle, inspection, diagnosis] = await Promise.all([
    fetchVehicle(carId),
    fetchInspection(carId).catch(() => null),
    fetchDiagnosis(carId),
  ]);

  const accidentHistory = vehicle?.vehicleNo
    ? await fetchAccidentHistory(carId, vehicle.vehicleNo).catch(() => null)
    : null;

  return { carId, vehicle, inspection, accidentHistory, diagnosis };
}
