"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
  addToShortlist,
  checkCarStatus,
  findCarsByVin,
  removeFromShortlist,
} from "./db/queries.js";
import { fetchFullCar, searchListings } from "./encar/client.js";
import { and, c, eq } from "./encar/query.js";
import { ingestCar } from "./db/ingest.js";
import { findModelGroupKey } from "./catalog-lookup.js";
import { db } from "./db/index.js";

export async function toggleShortlistAction(formData: FormData): Promise<void> {
  const carId = Number(formData.get("carId"));
  const action = String(formData.get("action") ?? "");
  if (!Number.isFinite(carId)) return;

  if (action === "add") {
    addToShortlist(carId);
  } else if (action === "remove") {
    removeFromShortlist(carId);
  }

  revalidatePath(`/car/${carId}`);
  revalidatePath("/shortlist");
}

/**
 * Background status check, called from the detail page's StatusCheckBeacon
 * client component on mount. Only revalidates when the status actually
 * changed — most calls are no-ops, so this is safe to fire on every page view.
 */
export async function checkCarStatusAction(carId: number): Promise<void> {
  if (!Number.isFinite(carId)) return;
  const prevRow = db()
    .prepare("SELECT listing_state FROM cars WHERE car_id = ?")
    .get(carId) as { listing_state: string } | undefined;
  if (!prevRow) return;

  const result = await checkCarStatus(carId).catch(() => null);
  if (result && result !== prevRow.listing_state) {
    revalidatePath(`/car/${carId}`);
    revalidatePath("/shortlist");
  }
}

/**
 * Translate the Korean inspector-comments block to English via Claude. Result
 * is cached on the car row, so this is a no-op after the first successful call.
 * Called from the detail page "Translate to English" button.
 */
export async function translateInspectionAction(formData: FormData): Promise<void> {
  const carId = Number(formData.get("carId"));
  if (!Number.isFinite(carId)) return;
  try {
    const { translateInspectionComments } = await import("./translate.js");
    await translateInspectionComments(carId);
  } catch (e) {
    console.error(`translateInspectionAction(${carId}) failed:`, (e as Error).message);
  }
  revalidatePath(`/car/${carId}`);
}

/**
 * Re-fetch a single car from Encar and update the DB row.
 * Called from the detail page Refresh button.
 */
export async function refreshCarAction(formData: FormData): Promise<void> {
  const carId = Number(formData.get("carId"));
  if (!Number.isFinite(carId)) return;
  try {
    const data = await fetchFullCar(carId);
    ingestCar(data);
  } catch (e) {
    console.error(`refreshCarAction(${carId}) failed:`, (e as Error).message);
  }
  revalidatePath(`/car/${carId}`);
}

/**
 * Re-run the Encar search for a given brand (and optional model filter), and
 * ingest the first 20 results. Picks up new listings AND refreshes prices on
 * existing ones.
 */
export async function refreshSearchAction(formData: FormData): Promise<void> {
  const brand = String(formData.get("brand") ?? "");
  const modelText = String(formData.get("model") ?? "");
  if (!brand) return;

  const modelKey = modelText ? findModelGroupKey(brand, modelText) : null;
  const inner = modelKey
    ? c(eq("Manufacturer", brand), eq("ModelGroup", modelKey))
    : eq("Manufacturer", brand);
  const query = and(eq("Hidden", "N"), inner);

  try {
    const res = await searchListings(query, { limit: 20 });
    for (const item of res.SearchResults) {
      try {
        const data = await fetchFullCar(Number(item.Id));
        ingestCar(data);
      } catch (e) {
        console.error(`  carid ${item.Id} failed: ${(e as Error).message}`);
      }
    }
    console.log(`refreshSearchAction: ingested up to 20 cars for ${brand}${modelKey ? ` / ${modelKey}` : ""}`);
  } catch (e) {
    console.error(`refreshSearchAction failed:`, (e as Error).message);
  }
  revalidatePath("/search");
  revalidatePath("/");
}

/**
 * Extract an Encar car ID from a pasted URL or a raw numeric string.
 * Supports the common formats:
 *   http(s)://www.encar.com/dc/dc_cardetailview.do?carid=12345678
 *   http(s)://fem.encar.com/cars/detail/12345678
 *   plain "12345678"
 */
function parseEncarCarId(input: string): number | null {
  const trimmed = input.trim();
  if (!trimmed) return null;

  if (/^\d+$/.test(trimmed)) {
    const n = Number(trimmed);
    return Number.isFinite(n) && n > 0 ? n : null;
  }

  const carIdParam = trimmed.match(/[?&]carid=(\d+)/i);
  if (carIdParam) return Number(carIdParam[1]);

  const pathDetail = trimmed.match(/\/cars\/detail\/(\d+)/i);
  if (pathDetail) return Number(pathDetail[1]);

  const anyDigits = trimmed.match(/(\d{6,})/);
  if (anyDigits) return Number(anyDigits[1]);

  return null;
}

/**
 * Fetch a car from Encar by URL/ID, ingest it into the local DB, then
 * redirect to the existing detail page (which already renders specs + history).
 * Errors are surfaced back to the form via the `error` search param.
 */
export async function manualSearchAction(formData: FormData): Promise<void> {
  const raw = String(formData.get("url") ?? "");
  const carId = parseEncarCarId(raw);
  if (!carId) {
    redirect(`/manual-search?error=${encodeURIComponent("Could not find a car ID in that input.")}`);
  }

  try {
    const data = await fetchFullCar(carId);
    if (!data.vehicle) {
      redirect(`/manual-search?error=${encodeURIComponent(`Car ${carId} not found on Encar (it may be sold or delisted).`)}`);
    }
    ingestCar(data);
  } catch (e) {
    // `redirect` throws internally — let it propagate.
    if ((e as { digest?: string }).digest?.startsWith("NEXT_REDIRECT")) throw e;
    const msg = (e as Error).message || "Unknown error";
    redirect(`/manual-search?error=${encodeURIComponent(`Fetch failed: ${msg}`)}`);
  }

  revalidatePath(`/car/${carId}`);
  redirect(`/car/${carId}`);
}

/**
 * Look up a VIN in the local DB and route to the result:
 *   - exactly one match → straight to /car/{id}
 *   - many matches (same VIN re-listed)  → /manual-search?vin=… so the page
 *     can render the candidate list
 *   - zero matches → error pointing the user at the URL form (KIDI has no
 *     public VIN API; the car must be ingested first via an Encar URL).
 */
export async function manualVinSearchAction(formData: FormData): Promise<void> {
  const raw = String(formData.get("vin") ?? "").trim().toUpperCase();
  if (!raw) {
    redirect(`/manual-search?error=${encodeURIComponent("Enter a VIN to search.")}`);
  }
  if (raw.length < 4) {
    redirect(`/manual-search?error=${encodeURIComponent("VIN too short — enter at least 4 characters.")}`);
  }

  const matches = findCarsByVin(raw);
  if (matches.length === 0) {
    redirect(
      `/manual-search?error=${encodeURIComponent(
        `No car with VIN "${raw}" in the local DB. KIDI has no public VIN lookup — ingest the Encar listing first using the URL form above.`,
      )}`,
    );
  }
  if (matches.length === 1) {
    redirect(`/car/${matches[0]!.car_id}`);
  }
  // Multiple → keep them on the page with a list rendered from the query.
  redirect(`/manual-search?vin=${encodeURIComponent(raw)}`);
}
