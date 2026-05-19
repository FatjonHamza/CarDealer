"use server";

import { revalidatePath } from "next/cache";
import { addToShortlist, removeFromShortlist } from "./db/queries.js";
import { fetchFullCar, searchListings } from "./encar/client.js";
import { and, c, eq } from "./encar/query.js";
import { ingestCar } from "./db/ingest.js";
import { findModelGroupKey } from "./catalog-lookup.js";

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
  const query = and(eq("Hidden", "N"), c(eq("CarType", "N"), inner));

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
