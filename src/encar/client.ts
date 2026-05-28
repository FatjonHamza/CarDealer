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
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "ko-KR,ko;q=0.9,en-US;q=0.8,en;q=0.7",
  "Accept-Encoding": "gzip, deflate, br",
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  Referer: `${WEB_BASE}/fc/fc_carsearchlist.do?carType=for`,
  Origin: WEB_BASE,
  // Sec-Fetch-* mimic what Chrome sends for an XHR from www.encar.com → api.encar.com.
  // CloudFront's bot detection trips when these are missing for an /api request.
  "Sec-Fetch-Site": "same-site",
  "Sec-Fetch-Mode": "cors",
  "Sec-Fetch-Dest": "empty",
  "Sec-Ch-Ua": '"Chromium";v="131", "Not_A Brand";v="24", "Google Chrome";v="131"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"macOS"',
};

export class EncarHttpError extends Error {
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

interface RetryPolicy {
  /** Wait times before each attempt (index 0 = first attempt, so should be 0). */
  backoffsMs: number[];
  label: string;
}

/**
 * Budget for UI-facing /search/* calls. CloudFront's bot block doesn't lift
 * instantly — a single 2s retry is almost always wasted. With three attempts
 * spanning ~25s we absorb a transient flag without surfacing an error, while
 * still failing fast enough to be useful when the block is real.
 */
const SEARCH_RETRY: RetryPolicy = {
  label: "search",
  backoffsMs: [0, 5_000, 20_000],
};

/**
 * Longer budget for per-car enrichment — these endpoints are less throttled
 * and a transient 5xx is worth waiting out so we don't lose KIDI data.
 */
const ENRICH_RETRY: RetryPolicy = {
  label: "enrich",
  backoffsMs: [0, 15_000, 60_000, 180_000],
};

/**
 * After a hard throttle on /search/*, short-circuit subsequent search calls
 * for this window instead of stacking more requests CloudFront will also drop.
 * The detail endpoints have a separate budget — enrichment continues to work.
 */
const SEARCH_BLOCK_WINDOW_MS = 90_000;
let searchBlockedUntil = 0;

export function isSearchBlocked(): { blocked: boolean; retryAfterMs: number } {
  const remaining = searchBlockedUntil - Date.now();
  return { blocked: remaining > 0, retryAfterMs: Math.max(0, remaining) };
}

async function getJsonWithRetry<T>(url: string, policy: RetryPolicy = ENRICH_RETRY): Promise<T> {
  let lastErr: unknown;
  for (let attempt = 0; attempt < policy.backoffsMs.length; attempt++) {
    const delay = policy.backoffsMs[attempt] ?? 0;
    if (delay > 0) {
      // console.warn (not error) so Next.js 15 dev overlay doesn't surface
      // transient retries as crash-level errors. A real failure throws at the
      // end of the loop and will be reported normally.
      console.warn(
        `  Encar transient error (${policy.label}) — backing off ${delay / 1000}s (attempt ${attempt}/${policy.backoffsMs.length - 1})`,
      );
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
  // Encar requires Asc/Desc suffix on Price/Mileage/Year; bare names return 400.
  sort?: "ModifiedDate" | "PriceAsc" | "PriceDesc" | "MileageAsc" | "MileageDesc" | "YearAsc" | "YearDesc";
  offset?: number;
  limit?: number;
}

export async function searchListings(
  query: Expr | string,
  opts: SearchOptions = {},
): Promise<SearchResponse> {
  const blocked = isSearchBlocked();
  if (blocked.blocked) {
    throw new Error(
      `Encar search is rate-limited — please retry in ${Math.ceil(blocked.retryAfterMs / 1000)}s.`,
    );
  }

  const { sort = "ModifiedDate", offset = 0, limit = 20 } = opts;
  const q = typeof query === "string" ? query : render(query);
  const sr = `|${sort}|${offset}|${limit}`;
  const url = `${API_BASE}/search/car/list/premium?count=true&q=${encodeURIComponent(q)}&sr=${encodeURIComponent(sr)}`;

  try {
    return await getJsonWithRetry<SearchResponse>(url, SEARCH_RETRY);
  } catch (e) {
    // After exhausting the tight retry budget, block further /search/* hits for
    // a window so subsequent renders fail fast instead of compounding throttle.
    if (isRetryable(e)) {
      searchBlockedUntil = Date.now() + SEARCH_BLOCK_WINDOW_MS;
    }
    throw e;
  }
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
 * Pulls every piece of data we know how to fetch for a single car.
 * Tolerant: any single failure becomes a null field, the rest still returns.
 *
 * Calls are sequential, not parallel: firing 3-4 simultaneous requests per car
 * across the (already concurrent) enrichment semaphore was multiplying peak
 * in-flight load enough to trip CloudFront's bot detection.
 */
export async function fetchFullCar(carId: number): Promise<FullCarData> {
  const vehicle = await fetchVehicle(carId);
  const inspection = await fetchInspection(carId).catch(() => null);
  const diagnosis = await fetchDiagnosis(carId);
  const accidentHistory = vehicle?.vehicleNo
    ? await fetchAccidentHistory(carId, vehicle.vehicleNo).catch(() => null)
    : null;

  return { carId, vehicle, inspection, accidentHistory, diagnosis };
}
